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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'lost' && styles.typeButtonActive,
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
              type === 'found' && styles.typeButtonActive,
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

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter item title"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the item and where it was lost/found"
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Camera size={24} color="#0891b2" />
          <Text style={styles.imageButtonText}>Add Photo</Text>
        </TouchableOpacity>

        {image && <Image source={{ uri: image }} style={styles.previewImage} />}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
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
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#ffffff',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#0891b2',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0891b2',
    fontWeight: '500',
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
    backgroundColor: '#0891b2',
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
