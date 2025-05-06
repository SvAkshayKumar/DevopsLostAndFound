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
  Platform, // Import Platform
  TouchableWithoutFeedback, // Import for modal overlay dismissal
  Keyboard, // Import Keyboard
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Camera, Upload, Edit2, X } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer; // Polyfill Buffer if needed

export default function AddItemScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [image, setImage] = useState<string | null>(null); // Stores the *public URL* after upload
  const [loading, setLoading] = useState(false); // Loading state for form submission
  const [imageUploading, setImageUploading] = useState(false); // Loading state for image upload specifically
  const router = useRouter();
  const [isImagePickerVisible, setImagePickerVisible] = useState(false);

  // --- Image Handling (Remains the same) ---
  const handleImagePick = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant media library permissions in your device settings.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.8, aspect: [4, 3],
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImagePickerVisible(false);
        setImageUploading(true);
        const uri = result.assets[0].uri;
        const uploadedUrl = await uploadImage(uri);
        if (uploadedUrl) setImage(uploadedUrl);
        setImageUploading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setImageUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant camera permissions in your device settings.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, quality: 0.8, aspect: [4, 3],
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImagePickerVisible(false);
        setImageUploading(true);
        const uri = result.assets[0].uri;
        const uploadedUrl = await uploadImage(uri);
        if (uploadedUrl) setImage(uploadedUrl);
        setImageUploading(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setImageUploading(false);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const contentType = 'image/jpeg';
      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(filePath, Buffer.from(base64, 'base64'), {
          contentType, upsert: false,
        });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath);
      console.log('Image Uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error instanceof Error ? error.message : error);
      Alert.alert('Upload Failed', 'There was an error uploading the image.');
      return null;
    }
  };

  const sendNotification = async (itemTitle: string, userId: string) => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Push notification permissions not granted. Cannot send notifications.');
            return;
        }
        let currentUserToken: string | null = null;
        try {
            const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
            if (!projectId) {
                console.error("Configuration Error in sendNotification: EXPO_PUBLIC_PROJECT_ID is not defined. Cannot get/update current user token.");
            } else {
                const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
                currentUserToken = tokenData.data;
                console.log('Current device Expo token:', currentUserToken);

                // --- Update ONLY the profile table for the current user ---
                const { error: profileUpdateError } = await supabase
                    .from('profiles')
                    .update({ push_token: currentUserToken, updated_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) })
                    .eq('id', userId); // Match the current user's ID

                if (profileUpdateError) {
                    console.error('Error saving current user token to Supabase profile:', profileUpdateError.message);
                } else {
                    console.log('Current user Expo token saved/updated in Supabase profile.');
                }
                // --- End Profile Update ---

                // --- Also Ensure token exists in the central push_tokens table ---
                //      (This runs regardless of profile update success/failure)
                if (currentUserToken) { // Only proceed if we have a token
                    const { error: upsertError } = await supabase
                        .from('push_tokens') // Target central table
                        .upsert({ push_token: currentUserToken }); // Ensure it exists

                    if (upsertError && upsertError.code !== '23505') { // Ignore primary key violation
                        console.error('Error upserting current device token into push_tokens table:', upsertError.message);
                    } else if (!upsertError) {
                        console.log('Current device Expo token ensured in push_tokens table.');
                    } else {
                        console.log(`Token ${currentUserToken} already exists in push_tokens table.`);
                    }
                }
            }
        } catch (tokenError) {
            console.error("Failed during token retrieval/profile update/push_token upsert:", tokenError);
            // Continue to try notifying others even if this part fails
        }


        // --- Fetching Recipients: Use push_tokens table ---
        // 3. Fetch ALL unique, non-null tokens from the dedicated push_tokens table
        const { data: tokensData, error: fetchError } = await supabase
            .from('push_tokens')
            .select('push_token')
            .not('push_token', 'is', null); // Explicitly filter nulls if needed

        if (fetchError) {
            console.error('Error fetching tokens from push_tokens table:', fetchError.message);
            return; // Cannot proceed
        }

        if (!tokensData || tokensData.length === 0) {
            console.log("No push tokens found in the push_tokens table to notify.");
            return;
        }

        // Extract the actual tokens and filter out the current user's token (if known) to avoid self-notification
        const recipientTokens = tokensData
                .map(item => item.push_token)
                .filter((token): token is string => // Type guard for string
                    token != null && token !== currentUserToken // Ensure not null and not current user
                );

        if (recipientTokens.length === 0) {
            console.log("No other recipient tokens found after filtering.");
            return;
        }
        console.log(`Found ${recipientTokens.length} recipient tokens from push_tokens table to notify.`);
        // --- End Fetching Recipients ---


        // 4. Prepare messages for the fetched recipient tokens (No change needed)
        const messages = recipientTokens.map(token => ({
            to: token,
            sound: 'default',
            title: `New ${type === 'lost' ? 'Lost' : 'Found'} Item Posted`,
            body: `"${itemTitle}" was just reported. Tap to view.`,
            data: { screen: '(tabs)' }, // Or your desired deep link target
        }));


        // 5. Send notifications using Expo's Push API (No change needed)
        try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });

            if (!response.ok) {
              let errorBody = 'Unknown error';
              try { errorBody = await response.text(); } catch (e) { /* Ignore */ }
              throw new Error(`Expo Push API request failed with status ${response.status}: ${errorBody}`);
            }

            const responseData = await response.json();
            console.log('Push notification response:', responseData);

            // Handle response tickets (Remove invalid tokens from push_tokens table)
            if (responseData.data && Array.isArray(responseData.data)) {
                responseData.data.forEach(async (ticket: any, index: number) => {
                    const targetToken = messages[index]?.to; // Get the token this ticket corresponds to
                    if (!targetToken) return;

                    if (ticket.status === 'error') {
                        console.error(`Error sending notification to token ${targetToken}: ${ticket.message}`);
                        if (ticket.details?.error === 'DeviceNotRegistered') {
                            console.log(`Removing invalid token from push_tokens table: ${targetToken}`);
                            // --- Delete from push_tokens table ---
                            const { error: deleteError } = await supabase
                                .from('push_tokens') // Target central table
                                .delete()
                                .eq('push_token', targetToken); // Match the token to delete

                            if (deleteError) {
                                // Log error, but don't stop processing other tickets
                                console.error(`Failed to remove invalid token ${targetToken} from push_tokens: ${deleteError.message}`);
                                // Check if it's an RLS error (42501)
                                if (deleteError.code === '42501') {
                                     console.error("RLS POLICY ERROR: Deleting from push_tokens failed. Check Supabase RLS policies for DELETE on push_tokens table.");
                                     // Maybe Alert the user/dev once?
                                }
                            }
                            // --- End Delete Block ---
                        }
                    } else if (ticket.status === 'ok') {
                         console.log(`Notification ticket generated successfully for token ${targetToken}, ID: ${ticket.id}`);
                    }
                });
            } else {
                console.warn("Unexpected response structure from Expo Push API:", responseData);
            }

        } catch (sendError) {
            console.error("Error sending push notifications:", sendError instanceof Error ? sendError.message : sendError);
        }

    } catch (error) {
        console.error('Overall error in sendNotification function:', error instanceof Error ? error.message : error);
    }
};


  // --- Form Submission (Remains the same) ---
  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Information', 'Please fill in both title and description.');
      return;
    }
    if (imageUploading) {
        Alert.alert('Please Wait', 'Image is still uploading.');
        return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Error', 'You must be signed in to post an item.');
        setLoading(false);
        router.replace('/auth');
        return;
      }
      const { data: insertedData, error } = await supabase.from('items').insert({
        title: title.trim(),
        description: description.trim(),
        type,
        image_url: image,
        user_id: user.id,
        user_email: user.email,
      }).select().single();
      if (error) throw error;
      if (!insertedData) throw new Error("Item insertion failed silently.");
      console.log("Item inserted successfully:", insertedData);
      const postedTitle = title.trim();
      setTitle('');
      setDescription('');
      setImage(null);
      await sendNotification(postedTitle, user.id); // Pass userId here
      Alert.alert('Success!', 'Your item has been posted successfully.');
      setLoading(false);
      router.replace('/');
    } catch (error) {
      console.error('Error adding item:', error instanceof Error ? error.message : error);
      Alert.alert('Submission Failed', 'There was an error posting your item. Please try again.');
      setLoading(false);
    }
  };

  // --- UI and Styles (Remains the same) ---
  const isLost = type === 'lost';
  const containerStyle = isLost ? styles.containerLost : styles.containerFound;
  const labelStyle = [styles.label, isLost ? styles.labelLost : styles.labelFound];
  const inputBorderStyle = isLost ? styles.inputLost : styles.inputFound;
  const imageButtonBorderStyle = isLost ? styles.imageButtonLost : styles.imageButtonFound;
  const imageButtonTextStyle = [styles.imageButtonText, isLost ? styles.imageButtonTextLost : styles.imageButtonTextFound];
  const submitButtonStyle = [
    styles.submitButton,
    isLost ? styles.submitButtonLost : styles.submitButtonFound,
    (loading || imageUploading) && styles.submitButtonDisabled,
  ];
  const activityIndicatorColor = isLost ? '#dc2626' : '#16a34a';
  const cameraIconColor = isLost ? styles.labelLost.color : styles.labelFound.color;

  return (
    <ScrollView
      style={[styles.container, containerStyle]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      scrollEnabled={!loading && !imageUploading}
    >
        {/* Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, isLost ? styles.typeButtonLostActive : styles.typeButtonLostInactive]}
            onPress={() => setType('lost')}
            disabled={loading || imageUploading} activeOpacity={0.7}
          >
            <Text style={[styles.typeButtonTextBase, isLost ? styles.typeButtonTextLostActive : styles.typeButtonTextInactive]}>
              Lost Item
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, !isLost ? styles.typeButtonFoundActive : styles.typeButtonFoundInactive]}
            onPress={() => setType('found')}
            disabled={loading || imageUploading} activeOpacity={0.7}
          >
            <Text style={[styles.typeButtonTextBase, !isLost ? styles.typeButtonTextFoundActive : styles.typeButtonTextInactive]}>
              Found Item
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <Text style={labelStyle}>Title</Text>
        <TextInput
          style={[styles.input, inputBorderStyle]}
          value={title} onChangeText={setTitle}
          placeholder="e.g., Black Wallet, Keys on Red Lanyard"
          placeholderTextColor="#9ca3af" editable={!loading && !imageUploading} maxLength={100}
        />

        {/* Description Input */}
        <Text style={labelStyle}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, inputBorderStyle]}
          value={description} onChangeText={setDescription}
          placeholder="Describe the item, last seen location/time, specific markings, etc."
          placeholderTextColor="#9ca3af" multiline numberOfLines={5}
          editable={!loading && !imageUploading} maxLength={500}
        />

        {/* Image Picker Button */}
        {!image && !imageUploading && (
             <TouchableOpacity
                style={[styles.imageButton, imageButtonBorderStyle]}
                onPress={() => setImagePickerVisible(true)}
                disabled={loading || imageUploading} activeOpacity={0.7}
            >
                <Camera size={22} color={cameraIconColor} />
                <Text style={imageButtonTextStyle}>Add Photo</Text>
            </TouchableOpacity>
        )}

        {/* Image Picker Modal */}
        <Modal
          visible={isImagePickerVisible} transparent={true}
          animationType="slide" onRequestClose={() => setImagePickerVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setImagePickerVisible(false)}>
              <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                      <View style={styles.modalContent}>
                          <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
                            <Camera size={22} color="#3b82f6" />
                            <Text style={styles.modalOptionText}>Take Photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.modalOption} onPress={handleImagePick}>
                            <Edit2 size={22} color="#10b981" />
                            <Text style={styles.modalOptionText}>Choose from Gallery</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setImagePickerVisible(false)}>
                            <Text style={styles.modalCloseText}>Cancel</Text>
                          </TouchableOpacity>
                      </View>
                  </TouchableWithoutFeedback>
              </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Image Uploading Indicator */}
        {imageUploading && (
          <View style={[styles.imageContainer, inputBorderStyle]}>
            <ActivityIndicator size="large" color={activityIndicatorColor} />
            <Text style={styles.uploadingText}>Uploading image...</Text>
          </View>
        )}

        {/* Image Preview */}
        {!imageUploading && image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover"/>
            <TouchableOpacity style={styles.imageRemoveButton} onPress={() => setImage(null)} disabled={loading} activeOpacity={0.7}>
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={submitButtonStyle} onPress={handleSubmit}
          disabled={loading || imageUploading} activeOpacity={0.8}
        >
          {loading ? (<ActivityIndicator size="small" color="#ffffff" />) : (<Upload size={20} color="#ffffff" />)}
          <Text style={styles.submitButtonText}>{loading ? 'Posting...' : 'Post Item'}</Text>
        </TouchableOpacity>

    </ScrollView>
  );
}


// --- Styles (Remains the same) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLost: {
    backgroundColor: '#fef2f2', // Lighter red background
  },
  containerFound: {
    backgroundColor: '#f0fdfa', // Lighter green background
  },
  content: {
    padding: 20, // Increased padding
    paddingBottom: 40, // More space at the bottom
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    // Removed individual padding, handled by button padding
    elevation: 1, // Subtle elevation
    shadowColor: '#9ca3af',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb', // Light border
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14, // Increased padding
    alignItems: 'center',
    borderRadius: 10, // Slightly adjusted radius to fit container
    margin: 4, // Add margin to create space between buttons and border
  },
  typeButtonLostActive: {
    backgroundColor: '#fee2e2', // Red-100
  },
  typeButtonFoundActive: {
    backgroundColor: '#d1fae5', // Green-100
  },
  typeButtonLostInactive: {
    backgroundColor: 'transparent',
  },
  typeButtonFoundInactive: {
    backgroundColor: 'transparent',
  },
  typeButtonTextBase: { // Base style for all type button text
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeButtonTextInactive: {
    color: '#6b7280', // Gray-500 for inactive
  },
  typeButtonTextLostActive: {
    color: '#dc2626', // Red-600 for active lost
  },
  typeButtonTextFoundActive: {
    color: '#16a34a', // Green-600 for active found
  },
  label: {
    fontSize: 15, // Slightly smaller label
    fontWeight: '600',
    marginBottom: 6, // Reduced margin
    marginLeft: 4, // Align with input padding start
  },
  labelLost: {
    color: '#b91c1c', // Darker Red-700
  },
  labelFound: {
    color: '#047857', // Darker Green-700
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10, // Slightly smaller radius
    paddingHorizontal: 14, // Adjusted padding
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1.5, // Slightly thicker border
    color: '#1f2937', // Gray-800 for text
  },
  inputLost: {
    borderColor: '#fca5a5', // Red-300 border
  },
  inputFound: {
    borderColor: '#6ee7b7', // Green-300 border
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12, // Ensure padding is consistent for multiline
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20, // More space after image button
    borderWidth: 1.5, // Dashed border for visual distinction
    borderStyle: 'dashed',
  },
  imageButtonLost: {
    borderColor: '#fca5a5', // Red-300 dashed border
  },
  imageButtonFound: {
    borderColor: '#6ee7b7', // Green-300 dashed border
  },
  imageButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  imageButtonTextLost: {
    color: '#b91c1c', // Darker Red-700
  },
  imageButtonTextFound: {
    color: '#047857', // Darker Green-700
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    marginBottom: 20,
    overflow: 'hidden', // Ensure image corners are clipped
    position: 'relative', // Needed for absolute positioning of remove button
  },
  previewImage: {
    width: '100%',
    height: '100%', // Make image fill container
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker semi-transparent background
    borderRadius: 15, // Make it circular
    padding: 5, // Adjust padding
    zIndex: 1,
    width: 30, // Fixed width
    height: 30, // Fixed height
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 16, // More space before submit
    elevation: 2, // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  submitButtonLost: {
    backgroundColor: '#dc2626', // Red-600
  },
  submitButtonFound: {
    backgroundColor: '#16a34a', // Green-600
  },
  submitButtonDisabled: {
    opacity: 0.5,
    elevation: 0, // Remove shadow when disabled
  },
  submitButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600', // Bolder text
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly darker overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30, // More padding at bottom
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // More vertical padding
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb', // Very light gray background
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6', // Subtle border
  },
  modalOptionText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  modalCloseButton: {
    marginTop: 8, // Add some space before cancel
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fef2f2', // Light red background for cancel
    borderRadius: 12,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#dc2626', // Red-600 for cancel text
    fontWeight: '600',
  },
});