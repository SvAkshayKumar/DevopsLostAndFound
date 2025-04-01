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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Camera, Upload } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

export default function AddItemScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    try {
      // 1️⃣ Request Camera & Gallery Permissions
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Permission Denied', 'You need to grant both Camera and Media Library permissions.');
        return;
      }
  
      // 2️⃣ Show a selection dialog (Camera or Gallery)
      Alert.alert(
        'Select Option',
        'Choose an image source',
        [
          {
            text: '📸 Open Camera',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ FIXED
                allowsEditing: true,
                quality: 1,
              });
  
              if (!result.canceled && result.assets?.length) {
                await uploadImage(result.assets[0].uri);
              }
            },
          },
          {
            text: '🖼️ Pick from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ FIXED
                allowsEditing: true,
                quality: 1,
              });
  
              if (!result.canceled && result.assets?.length) {
                await uploadImage(result.assets[0].uri);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Something went wrong while selecting an image.');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(filename, blob);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('item-images').getPublicUrl(filename);

      return publicUrl;
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

      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const { error } = await supabase.from('items').insert({
        title,
        description,
        type,
        image_url: imageUrl,
        user_id: user.id,
        user_email: user.email,
      });

      if (error) throw error;

      await sendNotification(title);
      Alert.alert('Success', 'Item posted successfully');
      router.back();
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
              type === 'found' && styles.typeButtonFoundInactive,
            ]}
            onPress={() => setType('lost')}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'lost' && styles.typeButtonTextActive,
              ]}
            >
              Lost Item
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'found' && styles.typeButtonFoundActive,
              type === 'lost' && styles.typeButtonLostInactive,
            ]}
            onPress={() => setType('found')}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'found' && styles.typeButtonTextActive,
              ]}
            >
              Found Item
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, type === 'lost' ? styles.labelLost : styles.labelFound]}>
          Title
        </Text>
        <TextInput
          style={[styles.input, type === 'lost' ? styles.inputLost : styles.inputFound]}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter item title"
          placeholderTextColor={type === 'lost' ? '#944141' : '#059669'}
        />

        <Text style={[styles.label, type === 'lost' ? styles.labelLost : styles.labelFound]}>
          Description
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            type === 'lost' ? styles.inputLost : styles.inputFound,
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the item and where it was lost/found"
          placeholderTextColor={type === 'lost' ? '#944141' : '#059669'}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity 
          style={[
            styles.imageButton,
            type === 'lost' ? styles.imageButtonLost : styles.imageButtonFound,
          ]} 
          onPress={pickImage}
        >
          <Camera size={24} color={type === 'lost' ? '#944141' : '#059669'} />
          <Text style={[
            styles.imageButtonText,
            type === 'lost' ? styles.imageButtonTextLost : styles.imageButtonTextFound,
          ]}>
            Add Photo
          </Text>
        </TouchableOpacity>

        {image && <Image source={{ uri: image }} style={styles.previewImage} />}

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
});