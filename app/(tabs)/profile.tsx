import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ScrollView,
  Platform,
  Modal,
  Linking,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  LogOut,
  Camera,
  Package,
  CreditCard as Edit2,
  Save,
  X,
  Settings,
  Lock,
  KeyRound,
  Bug,
  Mail,
  MessageCircle,
  Trash,
  HelpCircleIcon,
} from 'lucide-react-native';
import FeedbackModal from '../item/feedbackModal';
import PasswordModals from '../item/passwordModal';
import ResolvedItemDetailsModal from '../item/resolvedModal';
import {launchCamera, launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Item = {
  id: string;
  title: string;
  type: 'lost' | 'found';
  status: 'active' | 'resolved';
  created_at: string;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showResolvedModal, setShowResolvedModal] = useState(false);
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true); // Set loading to true when fetching
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: null,
              avatar_url: null,
            });

          if (createError) throw createError;
          await fetchUserData();
          return;
        }
        throw profileError;
      }

      if (profileData) {
        setUser(profileData);
        setEditedName(profileData.full_name || '');
      }

      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false); // Reset refreshing state when done
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const [isModalVisible, setIsModalVisible] = useState(false);

  
  const openCamera = async () => {
    setIsModalVisible(false);
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.7,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.error('ImagePicker Error:', response.errorMessage);
        Alert.alert('Error', 'Failed to take photo');
      } else if (response.assets && response.assets[0].base64) {
        uploadBase64Image(response.assets[0].base64);
      }
    });
  };

  const pickFromGallery = async () => {
    setIsModalVisible(false);
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.7,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.errorCode) {
        console.error('ImagePicker Error:', response.errorMessage);
        Alert.alert('Error', 'Failed to pick image');
      } else if (response.assets && response.assets[0].base64) {
        uploadBase64Image(response.assets[0].base64);
      }
    });
  };

  const uploadBase64Image = async (base64Image: string) => {
    try {
      if (!user?.id) {
        throw new Error("User ID is missing");
      }
  
      setLoading(true);
  
      // Convert base64 to Blob
      const base64Data = base64Image.split(",")[1] || base64Image;
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
      }
      const blob = new Blob([new Uint8Array(byteArrays)], { type: "image/jpeg" });

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
  
      if (fetchError) throw fetchError;
  
      const avatarUrl = data?.avatar_url;
      if(avatarUrl){
        let filename = user.id+"/"+avatarUrl.split('/').pop();
  
      if (!filename) {
        Alert.alert('Error', 'Failed to determine avatar file name');
        return;
      }
  
      // Remove the file from Supabase storage
      await supabase.storage
        .from('avatar-images')
        .remove([filename])
        .catch(() => {});
      }

  
      let filename = `${user.id}/${Date.now()}.jpg`;
  
      // Delete existing avatar if any
      await supabase.storage.from("avatar-images").remove([filename]);

      filename = `${user.id}/${Date.now()}.jpg`;
  
      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatar-images")
        .upload(filename, blob, {
          upsert: true,
          contentType: "image/jpeg",
        });
  
      if (uploadError) throw uploadError;
  
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatar-images")
        .getPublicUrl(filename);
  
      if (!publicUrlData.publicUrl) {
        throw new Error("Failed to get public URL");
      }
  
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq("id", user.id);
  
      if (updateError) throw updateError;
  
      // Refresh user data
      await fetchUserData();
      Alert.alert("Success", "Profile picture updated successfully");
      setAvatarModalVisible(false);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Alert.alert("Error", "Failed to upload profile picture. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      if (!user?.id) { 
        throw new Error('User ID is missing');
      }

      setLoading(true);

      // Convert image URI to Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
  
      if (fetchError) throw fetchError;
  
      const avatarUrl = data?.avatar_url;
      if (avatarUrl) {
        let filename = user.id+"/"+avatarUrl.split('/').pop();
  
      if (!filename) {
        Alert.alert('Error', 'Failed to determine avatar file name');
        return;
      }
  
      // Remove the file from Supabase storage
      await supabase.storage
        .from('avatar-images')
        .remove([filename])
        .catch(() => {});
      }

      const filename = `${user.id}/${Date.now()}.jpg`;

      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatar-images')
        .upload(filename, blob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatar-images')
        .getPublicUrl(filename);

      if (!publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh user data
      await fetchUserData();
      Alert.alert('Success', 'Profile picture updated successfully');
      setAvatarModalVisible(false);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      if (!user?.id) return;
  
      // Fetch the current avatar_url from the database
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
  
      if (fetchError) throw fetchError;
  
      const avatarUrl = data?.avatar_url;
      if (!avatarUrl) {
        Alert.alert('Info', 'No profile picture to remove');
        return;
      }
  
      // Extract filename from public URL
      const filename = user.id+"/"+avatarUrl.split('/').pop();
  
      if (!filename) {
        Alert.alert('Error', 'Failed to determine avatar file name');
        return;
      }
  
      // Remove the file from Supabase storage
      const { error: deleteError } = await supabase.storage
        .from('avatar-images')
        .remove([filename]);
  
      if (deleteError) throw deleteError;
  
      // Update the database to set avatar_url to null
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
      if (updateError) throw updateError;
      // Fetch updated user data
      await fetchUserData();
      Alert.alert('Success', 'Profile picture removed');
      setAvatarModalVisible(false);
    } catch (error) {
      console.error('Error deleting avatar:', error);
      Alert.alert('Error', 'Failed to remove profile picture');
    }
  };
  

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editedName })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      await fetchUserData();
      Alert.alert('Success','Successfully updated User Name');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleMarkItemResolved = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'resolved' })
        .eq('id', itemId);

      if (error) throw error;

      await fetchUserData();
    } catch (error) {
      console.error('Error marking item as resolved:', error);
      Alert.alert('Error', 'Failed to update item status');
    }
  };

  const [showResolvedModalResult, setShowResolvedModalResult] = useState(false);
  const [selectedResolvedItemId, setSelectedResolvedItemId] = useState<string | null>(null);
  
  const handleOpenResolvedModal = (itemId: string) => {
    setSelectedResolvedItemId(itemId);
    setShowResolvedModalResult(true);
  };
  
  const handleCloseResolvedModalResult = () => {
    setShowResolvedModalResult(false);
    setSelectedResolvedItemId(null);
  };

  const handleOpenFeedbackModal = (itemId: string) => {
    setSelectedItemId(itemId);
    setModalVisible(true);
  };

  const handleSubmitFeedback = (feedback: {
    helperName: string;
    rating: number;
    experience: string;
  }) => {
    console.log('Feedback submitted:', feedback);

    // Close the modal
    setModalVisible(false);

    // After feedback, mark the item as resolved
    if (selectedItemId) {
      handleMarkItemResolved(selectedItemId);
    }
  };

  const handleCloseResolvedModal = () => {
    setShowResolvedModal(false);
    setSelectedItemId(null);
  }

  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false); // Track sending state

  // Open WhatsApp chat
  const handleWhatsAppContact = () => {
    const phoneNumber = '+917483735082'; // Replace with actual number
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const contactMessageFormated = `Email Id : ${user?.email}\n Hello I am ${user?.full_name}\nYou can view my profile on ${user?.avatar_url}\nI am discovered the bug in the app here goes the details about the bug,\n${contactMessage}`;
      const response = await fetch('https://sendfeedback.onrender.com/report-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: contactMessageFormated,
        }),
      });
  
      const data = await response.json();
      
      if (response.status === 200) {
        setIsSending(false);
        Alert.alert('Thank you for reporting the bug!');
      } else {
        throw new Error(data.error || 'Failed to send the report');
      }
    } catch (error) {
      setIsSending(false);
      console.error('Email sending failed:', error);
      Alert.alert('Failed to send the report. Please try again.');
    }
  };

  const handleEmailRedirect = () => {
    const mailtoUrl = 'mailto:adevadiga2005@gmail.com';

    Linking.openURL(mailtoUrl).catch((err) =>
      console.error('Error opening mail app', err)
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData(); // Trigger data refetch
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Please sign in to view your profile</Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.replace('/auth')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
    
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0891b2" // Color of the refresh indicator
          title="Pull to refresh" // Optional: Text shown during refresh (iOS only)
          titleColor="#64748b" // Optional: Text color (iOS only)
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => user.avatar_url && setSelectedImage(user.avatar_url)}
        >
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Camera size={24} color="#64748b" />
            </View>
          )}
          <TouchableOpacity
            style={styles.avatarOverlay}
            onPress={() => setAvatarModalVisible(true)}
          >
            <Edit2 size={16} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
              >
                <Save size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <Text style={styles.name}>
                {user.full_name || 'Add your name'}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Edit2 size={16} color="#0891b2" />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setIsSettingsOpen(true)}
          >
            <Settings size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleSignOut}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {
              items.filter(
                (item) => item.type === 'lost' && item.status === 'active'
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Active Lost</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {
              items.filter(
                (item) => item.type === 'found' && item.status === 'active'
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Active Found</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {items.filter((item) => item.status === 'resolved').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Package size={20} color="#0891b2" />
          <Text style={styles.sectionTitle}>My Items</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View style={styles.itemMeta}>
                <Text
                  style={[
                    styles.itemType,
                    {
                      backgroundColor:
                        item.type === 'lost' ? '#fee2e2' : '#dcfce7',
                    },
                  ]}
                >
                  {item.type.toUpperCase()}
                </Text>

                {item.status === 'resolved' ? (
                  <TouchableOpacity onPress={() => handleOpenResolvedModal(item.id)}>
                    <Text
                      style={[
                        styles.itemStatus,
                        { color: '#059669', textDecorationLine: 'underline' },
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={[
                      styles.itemStatus,
                      {
                        color: item.status === 'active' ? '#0891b2' : '#059669',
                      },
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                )}
              </View>

              <ResolvedItemDetailsModal
                isVisible={showResolvedModalResult}
                onClose={handleCloseResolvedModalResult}
                itemId={selectedResolvedItemId ?? ""}
              />
            </View>

            {item.status === 'active' && (
              <View>
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={() => handleOpenFeedbackModal(item.id)}
                >
                  <Text style={styles.resolveButtonText}>
                    {item.type === 'lost' ? 'I Found It' : 'Owner Found'}
                  </Text>
                </TouchableOpacity>

                <FeedbackModal
                  isVisible={modalVisible}
                  onClose={() => setModalVisible(false)}
                  onSubmit={handleSubmitFeedback}
                  type={item.type}
                  itemId={item.id}
                />
              </View>
            )}
          </View>
        ))}

        {items.length === 0 && (
          <Text style={styles.emptyText}>No items posted yet</Text>
        )}
      </View>

      {/* Settings Drawer Modal */}
      <Modal
        visible={isSettingsOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Settings</Text>
              <TouchableOpacity
                onPress={() => setIsSettingsOpen(false)}
                style={styles.closeButtonDrawer}
              >
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => setIsPasswordModalOpen(true)}
            >
              <Lock size={20} color="#0891b2" />
              <Text style={styles.drawerItemText}>Forgot Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => setIsResetModalOpen(true)}
            >
              <KeyRound size={20} color="#0891b2" />
              <Text style={styles.drawerItemText}>Update Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => setIsBugModalOpen(true)}
            >
              <Bug size={20} color="#0891b2" />
              <Text style={styles.drawerItemText}>Report Bug</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleEmailRedirect}
            >
              <Mail size={20} color="#0891b2" />
              <Text style={styles.drawerItemText}>Contact Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleWhatsAppContact}
            >
              <MessageCircle size={20} color="#0891b2" />
              <Text style={styles.drawerItemText}>WhatsApp Contact</Text>
            </TouchableOpacity>

            {/* Report Bug & Contact Modal (Shared) */}
            <Modal
              visible={isBugModalOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsBugModalOpen(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Report Bug</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Describe the issue..."
                    value={contactMessage}
                    onChangeText={setContactMessage}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.button, isSending && styles.disabledButton]}
                    onPress={async () => {
                      await handleSendEmail();
                      setIsBugModalOpen(false);
                      setContactMessage('');
                    }}
                    disabled={isSending}
                  >
                    <Text style={styles.buttonText}>
                      {isSending ? 'Sending... Please wait' : 'Send'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setIsBugModalOpen(false)}
                  >
                    <X size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        </View>
      </Modal>

      <PasswordModals
        isPasswordModalOpen={isPasswordModalOpen}
        setIsPasswordModalOpen={setIsPasswordModalOpen}
        isResetModalOpen={isResetModalOpen}
        setIsResetModalOpen={setIsResetModalOpen}
        user={user}
        styles={styles}
      />

      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <X size={24} color="#000000" />
          </TouchableOpacity>
          {selectedImage && (
            <TouchableOpacity
              style={styles.modalImageContainer}
              onPress={() => setSelectedImage(null)}
            >
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* Modal for the upload and delete image */}
      <Modal
        visible={isAvatarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalAvatarOverlay}>
            <View style={styles.modalAvatarContainer}>
              <TouchableOpacity
                style={styles.closeAvatarButton}
                onPress={() => setAvatarModalVisible(false)}
              >
                <Text style={styles.closeAvatarText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modalAvatarTitle}>
                Update Profile Picture
              </Text>

              {/* Button to open modal */}
              <TouchableOpacity style={styles.modalAvatarOption} onPress={() => setIsModalVisible(true)}>
                <Edit2 size={18} color="#000" />
                <Text style={styles.modalAvatarText}>Upload New Picture</Text>
              </TouchableOpacity>

              {/* Modal for selecting image source */}
              <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
              >
                <View style={styles.modalOverlay1}>
                  <View style={styles.modalContainer1}>
                    <Text style={styles.modalTitle1}>Select Image Source</Text>

                    <TouchableOpacity style={styles.modalOption} onPress={openCamera}>
                      <Text style={styles.modalOptionText}>📸 Open Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.modalOption} onPress={pickFromGallery}>
                      <Text style={styles.modalOptionText}>🖼️ Pick from Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.modalOption} onPress={() => setIsModalVisible(false)}>
                      <Text style={styles.modalOptionText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>


              <TouchableOpacity
                style={styles.modalAvatarOption}
                onPress={handleDeleteAvatar}
              >
                <Trash size={18} color="red" />
                <Text style={[styles.modalAvatarText, { color: 'red' }]}>
                  Remove Current Picture
                </Text>
              </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconButton: {
    padding: 8,
    marginLeft: 8,
  },

  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },

  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 4, // Add padding to accommodate the close button
  },

  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0891b2', // Use the theme color
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  drawerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
  },

  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },

  drawerItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },

  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },

  button: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  linkButton: {
    padding: 8,
    alignItems: 'center',
  },

  linkText: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: '500',
  },

  closeModalButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        paddingTop: 60,
      },
      android: {
        paddingTop: 40,
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 4,
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    fontSize: 20,
    color: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: '#0891b2',
    marginRight: 8,
    paddingVertical: 4,
  },
  saveButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 8,
  },
  signOutButton: {
    padding: 8,
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    marginVertical: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0891b2',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  itemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemType: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  itemStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  resolveButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  closeButtonDrawer: {
    position: 'absolute',
    top: -1,
    right: 10,
    zIndex: 2,
    padding: 8,
  },

  requirements: {
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  requirementText: {
    fontSize: 14,
  },
  resolvedButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolvedButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalAvatarOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Slight dim effect behind BlurView
  },

  blurBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  modalAvatarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  closeAvatarButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  closeAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64748b',
  },
  modalAvatarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalAvatarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  // Modal Overlay (background)
  modalOverlay1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background for the modal overlay
  },

  // Modal Container (the box that holds content)
  modalContainer1: {
    width: '80%',
    maxWidth: 400, // Prevents modal from being too wide on larger screens
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5, // Shadow for Android devices
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Modal Title (Heading)
  modalTitle1: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20, // Spacing below the title
    textAlign: 'center',
  },

  // Modal Option (each button option)
  modalOption: {
    paddingVertical: 12,
    marginVertical: 8,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    width: '100%', // Makes the button full width of the modal
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd', // Border color for the options
    transition: 'background-color 0.3s', // Smooth transition effect when hovering
  },

  // Text inside modal options
  modalOptionText: {
    fontSize: 16,
    color: '#333', // Standard dark text color
    fontWeight: '500',
  },

  // Hover effect for modal options (when user presses the button, it changes color)
  modalOptionHover: {
    backgroundColor: '#ddd', // Slightly darker background on hover
  },

  // Cancel Button
  cancelButton: {
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: '#ff4d4d', // Red for cancel button
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
});