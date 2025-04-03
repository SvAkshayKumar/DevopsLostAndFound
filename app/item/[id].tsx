import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Phone, Mail, MessageSquare, MessageCircle, CreditCard as Edit2, X, Camera, Save, ImagePlus, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

type Item = {
  id: string;
  title: string;
  description: string;
  type: 'lost' | 'found';
  image_url: string | null;
  user_id: string;
  user_email: string;
  created_at: string;
  status: 'active' | 'resolved';
};

type Contact = {
  id: string;
  contacted_by: string;
  contacted_by_email: string;
  method: string;
  created_at: string;
};

type Profile = {
  phone_number: string | null;
};

export default function ItemScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const router = useRouter();

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isImagePickerVisible, setImagePickerVisible] = useState(false);
  const [deleteModalVisible , setDeleteModalVisible ] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
      }
    };
    getCurrentUser();
    fetchItem();
    fetchContacts();

    // Subscribe to contacts changes
    const subscription = supabase
      .channel('contact_attempts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_attempts',
        filter: `item_id=eq.${id}`,
      }, () => {
        fetchContacts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const fetchItem = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: itemData, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching item:', error);
      return;
    }

    setItem(itemData);
    setIsOwner(user?.id === itemData.user_id);
    setEditedTitle(itemData.title);
    setEditedDescription(itemData.description);

    if (itemData) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', itemData.user_id)
        .single();
      
      setOwnerProfile(profileData);
    }
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contact_attempts')
      .select(`
        *,
        contacted_by_user:contacted_by(email)
      `)
      .eq('item_id', id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching contacts:', error);
      return;
    }
    const formattedContacts = data.map(contact => ({
      id: contact.id,
      contacted_by: contact.contacted_by_user?.email || "Unknown",
      method: contact.method,
      created_at: contact.created_at,
    }));

    setContacts(formattedContacts || []);
  };

  const handleContact = async (method: string) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login before contacting the owner.');
      return;
    }
  
    if (!item) return;

    try {
      const { error } = await supabase.from('contact_attempts').insert({
        contacted_by: currentUser,
        posted_user_id: item.user_id,
        item_id: id,
        method,
      });

      if (error) throw error;

      switch (method) { 
        case 'phone':
          if (ownerProfile?.phone_number) {
            Linking.openURL(`tel:${ownerProfile.phone_number}`);
          }
          break;
        case 'email':
          Linking.openURL(`mailto:${item.user_email}`);
          break;
        case 'sms':
          if (ownerProfile?.phone_number) {
            Linking.openURL(`sms:${ownerProfile.phone_number}?body=Hello, I am contacting you regarding...`);
          }
          break;
        case 'whatsapp':
          if (ownerProfile?.phone_number) {
            Linking.openURL(`https://wa.me/${ownerProfile.phone_number}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      Alert.alert('Error', 'Failed to record contact');
    }
  };

  const handleSaveChanges = async () => {
    if (!item) return;

    try {
      const { error } = await supabase
        .from('items')
        .update({
          title: editedTitle,
          description: editedDescription,
        })
        .eq('id', item.id);

      if (error) throw error;

      setIsEditing(false);
      fetchItem(); // Refresh item data
      Alert.alert('Success', 'Item details updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item details');
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await uploadImage(uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take a photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await uploadImage(uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      if (!item || !currentUser) return;
  
      // Define the structured filename: userId/lost-or-found/timestamp.jpg
      const filename = `${currentUser}/${item.type}/${Date.now()}.jpg`;
  
      // 1. Get existing image URL from the database
      const { data: existingItem, error: fetchError } = await supabase
        .from('items')
        .select('image_url')
        .eq('id', item.id)
        .single();
  
      if (fetchError) throw fetchError;
  
      if (existingItem?.image_url) {
        // Extract filename from the existing URL and delete it
        const existingFilename = existingItem.image_url.split('/item-images/').pop();
  
        if (existingFilename) {
          const { error: deleteError } = await supabase.storage
            .from('item-images')
            .remove([existingFilename]);
  
          if (deleteError) throw deleteError;
        }
      }
  
      // 2. Upload the new image
      const response = await fetch(uri);
      const blob = await response.blob();
  
      const { data, error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(filename, blob);
  
      if (uploadError) throw uploadError;
  
      // 3. Get the public URL of the new image
      const { data: publicUrlData, error: urlError } = await supabase.storage
        .from('item-images')
        .getPublicUrl(filename);
  
      if (urlError) throw urlError;
  
      const publicUrl = publicUrlData.publicUrl;
  
      // 4. Update the database with the new image URL
      const { error: updateError } = await supabase
        .from('items')
        .update({ image_url: publicUrl })
        .eq('id', item.id);
  
      if (updateError) throw updateError;
  
      fetchItem(); // Refresh item data
      setImagePickerVisible(false);
      Alert.alert('Success', 'Image updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleDelete = async () => {
    if (!item) return;
  
    try {
      // Delete the item image from storage
      if (item.image_url) {
        const filename = item.image_url.split('/item-images/').pop();
        if (filename) {
          await supabase.storage.from('item-images').remove([filename]);
        }
      }
  
      // Delete the item from the database
      const { error } = await supabase.from('items').delete().eq('id', item.id);
      if (error) throw error;
  
      setDeleteModalVisible(false);
      Alert.alert('Deleted', 'Item has been deleted successfully');
  
      // Navigate back to home
      router.replace('/');
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete the item');
    }
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0891b2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{item.title}</Text>
        {isOwner && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <Save size={24} color="#0891b2" />
            ) : (
              <Edit2 size={24} color="#0891b2" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {item.image_url ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.image} />
            {isEditing && (
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => setImagePickerVisible(true)}
              >
                <Camera size={24} color="#ffffff" />
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isOwner && (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={() => setImagePickerVisible(true)}
          >
            <ImagePlus size={32} color="#0891b2" />
            <Text style={styles.addImageText}>Add Image</Text>
          </TouchableOpacity>
        )}

        <View style={styles.details}>
          <View style={styles.typeContainer}>
            <Text
              style={[
                styles.type,
                { backgroundColor: item.type === 'lost' ? '#fee2e2' : '#dcfce7' },
              ]}
            >
              {item.type.toUpperCase()}
            </Text>

            {isOwner && (
              <TouchableOpacity onPress={() => setDeleteModalVisible(true)} style={styles.deleteButton}>
                <Trash2 size={20} color="red" />
              </TouchableOpacity>
            )}
          </View>
          

          {/* Delete Confirmation Modal */}
          <Modal visible={deleteModalVisible} transparent animationType="fade">
            <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <Trash2 size={40} color="red" />
                <Text style={styles.modalTitle}>Delete Item</Text>
                <Text style={styles.modalText}>
                  This action cannot be undone. Are you sure you want to delete this item?
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setDeleteModalVisible(false)}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteConfirmButton} onPress={handleDelete}>
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {isEditing ? (
            <>
              <TextInput
                style={styles.editInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholder="Title"
              />
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="Description"
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveChanges}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.meta}>
                Posted by {item.user_email}
                {'\n'}
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </>
          )}
        </View>

        {isOwner ? (
          <View style={styles.contactsList}>
            <Text style={styles.contactsTitle}>Reach Out Attempts</Text>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactItem}>
                <Text style={styles.contactEmail}>
                  {contact.contacted_by}
                </Text>
                <Text style={styles.contactMethod}>
                  via {contact.method}
                </Text>
                <Text style={styles.contactTime}>
                  {new Date(contact.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
            {contacts.length === 0 && (
              <Text style={styles.noContacts}>No contact requests yet</Text>
            )}
          </View>
        ) : (
          <View style={styles.contactOptions}>
            <Text style={styles.contactTitle}>Contact Options</Text>
            {ownerProfile?.phone_number && (
              <>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact('phone')}
                >
                  <Phone size={24} color="#0891b2" />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact('whatsapp')}
                >
                  <MessageCircle size={24} color="#0891b2" />
                  <Text style={styles.contactButtonText}>Send Whatsapp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact('sms')}
                >
                  <MessageSquare size={24} color="#0891b2" />
                  <Text style={styles.contactButtonText}>Send SMS</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContact('email')}
            >
              <Mail size={24} color="#0891b2" />
              <Text style={styles.contactButtonText}>Send Email</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={isImagePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {item.image_url ? 'Change Image' : 'Add Image'}
            </Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleTakePhoto}
            >
              <Camera size={24} color="#0891b2" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleImagePick}
            >
              <Edit2 size={24} color="#0891b2" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setImagePickerVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    marginTop: 45,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
  },
  backButton: {
    marginRight: 16,
  },
  editButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  addImageButton: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  addImageText: {
    marginTop: 8,
    fontSize: 16,
    color: '#0891b2',
    fontWeight: '500',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeImageText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 16,
  },
  details: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  // type: {
  //   alignSelf: 'flex-start',
  //   fontSize: 12,
  //   fontWeight: '600',
  //   paddingHorizontal: 10,
  //   paddingVertical: 5,
  //   borderRadius: 6,
  //   backgroundColor: '#e0f2fe',
  //   color: '#000000',
  //   marginBottom: 12,
  // },
  editInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  editTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  description: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
    lineHeight: 24,
  },
  meta: {
    fontSize: 14,
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactsList: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  contactsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    marginTop: 8,
  },
  contactItem: {
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 12,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  contactMethod: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  contactTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noContacts: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    padding: 32,
  },
  contactOptions: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    marginBottom: 12,
  },
  contactButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#0284c7',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 5,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  deleteButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'red',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: 300,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginRight: 5,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: 'red',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});