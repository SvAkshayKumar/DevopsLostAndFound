import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Camera, Upload,Edit2, X } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

export default function AddItemScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isImagePickerVisible, setImagePickerVisible] = useState(false);

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
        setImage(uri); // ✅ Update the image state
        setImagePickerVisible(false);
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
        setImage(uri); // ✅ Update the image state
        setImagePickerVisible(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };
  
  const uploadImage = async (uri: string, userId: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
  
      const filename = `${userId}/${type}/${Date.now()}.jpg`; // Organized storage path
  
      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(filename, blob, { upsert: false });
  
      if (error) throw error;
  
      // Fetch the public URL
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(filename);
      
      setImage(urlData.publicUrl); // ✅ Set the image state to the uploaded URL
  
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };
  

  const sendNotification = async (itemTitle: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `New ${type} item posted!`,
          body: `Someone ${type} ${itemTitle}. Check it out!`,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
  
    setLoading(true);
  
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to post an item');
        return;
      }
  
      let imageUrl = image; // ✅ Use the existing image state
      if (image && !image.startsWith('https://')) { 
        imageUrl = await uploadImage(image, user.id); // ✅ Upload only if not already a URL
      }
  
      const { error } = await supabase.from('items').insert({
        title,
        description,
        type,
        image_url: imageUrl, // ✅ Now properly linked
        user_id: user.id,
        user_email: user.email,
      });
  
      if (error) throw error;
      setTitle('');
      setDescription('');
      setImage(null);
  
      await sendNotification(title);
      Alert.alert('Success', 'Item posted successfully');
      router.replace('/');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to post item');
    } finally {
      setLoading(false);
    }
  };
  

  const containerStyle = type === 'lost' 
    ? styles.containerLost 
    : styles.containerFound;

  const buttonStyle = type === 'lost'
    ? styles.submitButtonLost
    : styles.submitButtonFound;
    
      return (
          <ScrollView style={[styles.container, containerStyle]}>
            <View style={styles.content}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'lost' && styles.typeButtonLostActive,
                  ]}
                  onPress={() => setType('lost')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === 'lost' && styles.typeButtonTextLost,
                  ]}>
                    Lost Item
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'found' && styles.typeButtonFoundActive,
                  ]}
                  onPress={() => setType('found')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === 'found' && styles.typeButtonTextFound,
                  ]}>
                    Found Item
                  </Text>
                </TouchableOpacity>
              </View>
    
              <Text style={[styles.label, type === 'lost' ? styles.labelLost : styles.labelFound]}>
                Title
              </Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter item title"
                placeholderTextColor="#64748b"
              />
    
              <Text style={[styles.label, type === 'lost' ? styles.labelLost : styles.labelFound]}>
                Description
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the item and where it was lost/found"
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
              />
    
              <TouchableOpacity 
                style={styles.imageButton}
                onPress={() => setImagePickerVisible(true)}
              >
                <Camera size={24} color={type === 'lost' ? '#dc2626' : '#16a34a'} />
                <Text style={[
                  styles.imageButtonText,
                  type === 'lost' ? styles.imageButtonTextLost : styles.imageButtonTextFound
                ]}>
                  Add Photo
                </Text>
              </TouchableOpacity>
    
              <Modal
                visible={isImagePickerVisible}
                transparent={true}
                animationType="slide"
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={handleTakePhoto}
                    >
                      <Camera size={24} color="#3b82f6" />
                      <Text style={styles.modalOptionText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={handleImagePick}
                    >
                      <Edit2 size={24} color="#3b82f6" />
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
    
              {image && (
                <View style={styles.imageContainer}>
                  <TouchableOpacity 
                    style={styles.imageRemoveButton} 
                    onPress={() => setImage(null)}
                  >
                    <X size={20} color="black" />
                  </TouchableOpacity>
                  <Image source={{ uri: image }} style={styles.previewImage} />                  
                </View>
              )}
    
              <TouchableOpacity
                style={[buttonStyle, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Upload size={20} color="#ffffff" />
                <Text style={styles.submitButtonText}>
                  {loading ? 'Posting...' : 'Post Item'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
      );
    }
    
    const styles = StyleSheet.create({
      backgroundImage: {
        flex: 1,
      },
      container: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // Semi-transparent white overlay
      },
      containerLost: {
        backgroundColor: 'rgba(254, 226, 226, 0.85)',
      },
      containerFound: {
        backgroundColor: 'rgba(220, 252, 231, 0.85)',
      },
      content: {
        padding: 20,
        margin: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      },
      typeSelector: {
        flexDirection: 'row',
        marginBottom: 24,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 4,
        overflow: 'hidden',
      },
      typeButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
      },
      typeButtonLostActive: {
        backgroundColor: '#dc2626',
      },
      typeButtonFoundActive: {
        backgroundColor: '#16a34a',
      },
      typeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
      },
      typeButtonTextLost: {
        color: '#ffffff',
      },
      typeButtonTextFound: {
        color: '#ffffff',
      },
      label: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
      },
      labelLost: {
        color: '#dc2626',
      },
      labelFound: {
        color: '#16a34a',
      },
      input: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
      textArea: {
        height: 120,
        textAlignVertical: 'top',
      },
      imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      imageButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
      },
      imageButtonTextLost: {
        color: '#dc2626',
      },
      imageButtonTextFound: {
        color: '#16a34a',
      },
      previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      submitButtonLost: {
        backgroundColor: '#dc2626',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
      },
      submitButtonFound: {
        backgroundColor: '#16a34a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
      },
      submitButtonDisabled: {
        opacity: 0.6,
      },
      submitButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '600',
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'flex-end',
      },
      modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
      },
      modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      modalOptionText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '600',
      },
      modalCloseButton: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
      },
      modalCloseText: {
        fontSize: 16,
        color: '#dc2626',
        fontWeight: '600',
      }, 
    });