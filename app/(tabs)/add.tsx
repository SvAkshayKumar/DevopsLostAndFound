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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Camera, Upload, Edit2, X } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

export default function AddItemScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false); // ✅ New state for image upload
  const router = useRouter();
  const [isImagePickerVisible, setImagePickerVisible] = useState(false);

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setImagePickerVisible(false); // ✅ Close modal immediately
        setImageUploading(true); // ✅ Start loading state
        const uri = result.assets[0].uri;
        const uploadedUrl = await uploadImage(uri);
        if (uploadedUrl) setImage(uploadedUrl);
        setImageUploading(false); // ✅ End loading state
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setImageUploading(false);
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
      });

      if (!result.canceled && result.assets[0]) {
        setImagePickerVisible(false); // ✅ Close modal immediately
        setImageUploading(true); // ✅ Start loading state
        const uri = result.assets[0].uri;
        const uploadedUrl = await uploadImage(uri);
        if (uploadedUrl) setImage(uploadedUrl);
        setImageUploading(false); // ✅ End loading state
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      setImageUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('File does not exist');

      const fileBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const contentType = 'image/jpeg';
      const filename = `${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(filename, Buffer.from(fileBase64, 'base64'), { contentType });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('item-images').getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', 'There was an error uploading the image.');
      return null;
    }
  };

  const sendNotification = async (itemTitle: string, userId: string) => {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }
  
      // Request permission if not already granted
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
  
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
  
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
  
      // Get current device's Expo Push Token
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      const expoToken = token;
  
      console.log('Current device Expo token:', expoToken);
  
      // Save the current device's token to Supabase
      const { error: tokenError } = await supabase
        .from('profiles')
        .update({ push_token: expoToken })
        .eq('id', userId);
  
      if (tokenError) {
        console.error('Error saving token to Supabase:', tokenError);
      } else {
        console.log('Expo token saved to Supabase');
      }
  
      // Fetch all users with valid tokens
      const { data: users, error: fetchError } = await supabase
        .from('profiles')
        .select('id, push_token')
        .not('push_token', 'is', null);
  
      if (fetchError) {
        console.error('Error fetching tokens from Supabase:', fetchError);
        return;
      }
  
      // Send notifications to all valid tokens
      for (const user of users) {
        const targetToken = user.push_token;
  
        const message = {
          to: targetToken,
          sound: 'default',
          title: 'New Item Posted',
          body: `A new item titled "${itemTitle}" has been posted.`,
          data: { itemTitle },
        };
  
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
  
        const resData = await response.json();
  
        // If the token is no longer valid, remove it
        if (
          resData.data?.status === 'error' &&
          resData.data?.details?.error === 'DeviceNotRegistered'
        ) {
          await supabase
            .from('profiles')
            .update({ push_token: null })
            .eq('id', user.id);
          console.log(`Removed invalid token for user ${user.id}`);
        } else {
          console.log(`Notification sent to ${targetToken}`);
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
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

      const { error } = await supabase.from('items').insert({
        title,
        description,
        type,
        image_url: image,
        user_id: user.id,
        user_email: user.email,
      });

      if (error) throw error;
      
      setTitle('');
      setDescription('');
      setImage(null);

      await sendNotification(title,user.id);
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
    <ScrollView style={[styles.container, containerStyle]} scrollEnabled={!imageUploading && !loading}>
      <View style={styles.content}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'lost' && styles.typeButtonLostActive,
            ]}
            onPress={() => setType('lost')}
            disabled={imageUploading || loading} // ✅ Disable during upload
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
            disabled={imageUploading || loading} // ✅ Disable during upload
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
          editable={!imageUploading && !loading} // ✅ Disable during upload
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
          editable={!imageUploading && !loading} // ✅ Disable during upload
        />

        <TouchableOpacity 
          style={styles.imageButton}
          onPress={() => setImagePickerVisible(true)}
          disabled={imageUploading || loading} // ✅ Disable during upload
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

        {imageUploading ? (
          <View style={styles.imageContainer}>
            <ActivityIndicator size="large" color={type === 'lost' ? '#dc2626' : '#16a34a'} />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        ) : image ? (
          <View style={styles.imageContainer}>
            <TouchableOpacity 
              style={styles.imageRemoveButton} 
              onPress={() => setImage(null)}
              disabled={loading} // ✅ Disable during submit
            >
              <X size={20} color="black" />
            </TouchableOpacity>
            <Image source={{ uri: image }} style={styles.previewImage} />                  
          </View>
        ) : null}

        <TouchableOpacity
          style={[buttonStyle, (loading || imageUploading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || imageUploading} // ✅ Disable during upload or submit
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
  container: {
    flex: 1,
  },
  containerLost: {
    backgroundColor: '#fef2f2',
  },
  containerFound: {
    backgroundColor: '#f0fdfa',
  },
  content: {
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonLostActive: {
    backgroundColor: '#fee2e2',
  },
  typeButtonFoundActive: {
    backgroundColor: '#ccfbf1',
  },
  typeButtonLostInactive: {
    backgroundColor: 'transparent',
  },
  typeButtonFoundInactive: {
    backgroundColor: 'transparent',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#0f172a',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelLost: {
    color: '#991b1b',
  },
  labelFound: {
    color: '#047857',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  inputLost: {
    borderColor: '#fecaca',
  },
  inputFound: {
    borderColor: '#99f6e4',
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
  },
  imageButtonLost: {
    borderColor: '#fecaca',
  },
  imageButtonFound: {
    borderColor: '#99f6e4',
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  imageButtonTextLost: {
    color: '#944141',
  },
  imageButtonTextFound: {
    color: '#059669',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  submitButtonLost: {
    backgroundColor: '#944141',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  submitButtonFound: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
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
  // Overlay for the modal background
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // dim background
    justifyContent: 'flex-end', // slides up from bottom
  },

  // Container for the modal content
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },

  // Each option inside modal (e.g. Camera, Gallery)
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

  // Text for each modal option
  modalOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },

  // Close/Cancel button styling
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },

  // Close button text
  modalCloseText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb', // neutral border (Tailwind's gray-200)
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb', // soft background
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280', // gray-500
    fontStyle: 'italic',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
  },
  typeButtonTextLost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626', // Tailwind's red-600, good for indicating "lost"
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  typeButtonTextFound: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16a34a', // Tailwind's green-600
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});