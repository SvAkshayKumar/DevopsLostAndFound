import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator, // Import ActivityIndicator
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
  Star,
  Filter, // Added for filter icon
  HelpCircleIcon, // Kept if used elsewhere, otherwise remove
} from 'lucide-react-native';
import FeedbackModal from '../item/feedbackModal';
import PasswordModals from '../item/passwordModal';
import ResolvedItemDetailsModal from '../item/resolvedModal';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// --- Type Definitions ---
type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Feedback = {
  helper_name: string;
  rating: number;
  experience: string;
  created_at: string; // Added created_at here as well
};

type ItemStatus = 'active' | 'resolved' | 'removed' | 'disabled'; // Expand status type

type Item = {
  id: string;
  title: string;
  type: 'lost' | 'found';
  status: ItemStatus; // Use expanded type
  created_at: string;
  feedback?: Feedback | null; // Expect single object or null after processing
};

type ActiveFilter = 'all' | 'lost' | 'found' | 'resolved'; // Type for filter state

// --- End Type Definitions ---

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedItemIdForFeedback, setSelectedItemIdForFeedback] = useState<
    string | null
  >(null);
  const [showResolvedModalResult, setShowResolvedModalResult] = useState(false);
  const [selectedResolvedItemId, setSelectedResolvedItemId] = useState<
    string | null
  >(null);
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // State for item filtering
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  // --- Data Fetching ---
  const fetchUserData = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.log('No authenticated user or error:', authError?.message);
        setUser(null);
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch Profile (with create logic)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      let currentUserProfile = profileData;
      if (profileError && profileError.code === 'PGRST116') {
        console.log('Profile not found, attempting to create...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: authUser.id, email: authUser.email })
          .select()
          .single();
        if (createError)
          throw new Error(`Failed to create profile: ${createError.message}`);
        currentUserProfile = newProfile;
      } else if (profileError) {
        throw new Error(`Failed to fetch profile: ${profileError.message}`);
      }

      if (currentUserProfile) {
        setUser(currentUserProfile);
        setEditedName(currentUserProfile.full_name || '');
        setImage(currentUserProfile.avatar_url);
      } else {
        console.log('Profile data is unexpectedly null.');
        Alert.alert('Error', 'Failed to fetch user profile data.');
        setUser(null);
      }

      // Fetch Items WITH latest Feedback
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select(
          `id, title, type, status, created_at, feedback ( helper_name, rating, experience, created_at )`,
        )
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false }); // Fetch all items first

      if (itemsError)
        throw new Error(`Failed to fetch items: ${itemsError.message}`);

      // Process items to get only the latest feedback entry per item
      const processedItems = (itemsData || []).map((item) => {
        let latestFeedback: Feedback | null = null;
        if (Array.isArray(item.feedback) && item.feedback.length > 0) {
          latestFeedback = item.feedback.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0];
        } else if (item.feedback && !Array.isArray(item.feedback)) {
          latestFeedback = item.feedback as Feedback;
        }
        return { ...item, feedback: latestFeedback };
      });

      setItems(processedItems as Item[]);
    } catch (error: any) {
      console.log('Error in fetchUserData:', error);
      Alert.alert(
        'Error Loading Data',
        error.message || 'Failed to load profile data.',
      );
      setUser(null);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // No dependencies needed if it only fetches current user data

  useEffect(() => {
    setLoading(true);
    fetchUserData();
  }, [fetchUserData]);

  // --- Refresh Handler ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
  }, [fetchUserData]);

  // --- Event Handlers (SignOut, Profile Update, Avatar etc.) ---
  // Handle signOut
  const handleSignOut = async () => {
    // Add a confirmation Alert because signing out globally is a bigger action
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out from all devices?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out Everywhere',
          style: 'destructive',
          // Make the onPress function async to use await
          onPress: async () => {
            try {
              console.log('Attempting global sign out...');
              // Use the 'global' scope to invalidate all sessions for the user
              const { error } = await supabase.auth.signOut({
                scope: 'global',
              });

              if (error) {
                // Throw the error to be caught by the outer catch block
                throw error;
              }

              console.log('Global sign out successful.');
              // Navigate to login/auth screen after successful sign out
              router.replace('/auth'); // Adjust path if needed
            } catch (error: any) {
              console.log('Error signing out globally:', error);
              Alert.alert(
                'Sign Out Error',
                error.message || 'Failed to sign out from all devices.',
              );
            }
          },
        },
      ],
      { cancelable: true }, // Allow dismissing the alert by tapping outside
    );
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setLoading(true); // Indicate loading state
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editedName.trim() || null }) // Use null if name is empty
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      // Update local state immediately for better UX (optimistic update)
      setUser((prevUser) =>
        prevUser ? { ...prevUser, full_name: editedName.trim() || null } : null,
      );
      Alert.alert('Success', 'User name updated successfully');
      // Optionally call fetchUserData() again if other profile aspects might change server-side
      // await fetchUserData();
    } catch (error: any) {
      console.log('Error updating profile:', error);
      Alert.alert('Update Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // --- Avatar Handlers ---
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for avatars
        quality: 0.7, // Reduce quality slightly
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarModalVisible(false);
        await uploadImage(result.assets[0].uri); // Await the upload
      }
    } catch (error: any) {
      console.log('Error taking photo:', error);
      Alert.alert('Camera Error', error.message || 'Failed to take photo.');
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Media library permission is required.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarModalVisible(false);
        await uploadImage(result.assets[0].uri); // Await the upload
      }
    } catch (error: any) {
      console.log('Error picking image:', error);
      Alert.alert('Gallery Error', error.message || 'Failed to pick image.');
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    // Return type
    if (!user) {
      Alert.alert('Error', 'User not logged in.');
      return null;
    }

    setLoading(true); // Show loading indicator
    let publicUrl: string | null = null; // Initialize publicUrl

    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Selected file does not exist.');

      const fileBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
      // Use user ID and timestamp for unique filename within user's folder
      const filename = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `public/${filename}`; // Path within the bucket

      // --- Delete Old Avatar (Optional but recommended) ---
      if (user.avatar_url) {
        try {
          // Extract the file path relative to the bucket from the full URL
          const urlParts = user.avatar_url.split('/avatar-images/');
          if (urlParts.length > 1) {
            const oldFilePath = decodeURIComponent(urlParts[1]);
            console.log(`Attempting to remove old avatar: ${oldFilePath}`);
            await supabase.storage.from('avatar-images').remove([oldFilePath]);
            console.log(`Successfully removed old avatar: ${oldFilePath}`);
          }
        } catch (removeError: any) {
          // Log error but don't block the upload if removal fails
          console.warn('Could not remove old avatar:', removeError.message);
        }
      }
      // --- End Delete Old Avatar ---

      // --- Upload New Avatar ---
      console.log(`Uploading new avatar to: ${filePath}`);
      const { error: uploadError } = await supabase.storage
        .from('avatar-images') // Ensure this is your bucket name
        .upload(filePath, Buffer.from(fileBase64, 'base64'), {
          contentType,
          cacheControl: '3600', // Cache for 1 hour
          upsert: false, // Don't upsert, rely on unique filename
        });

      if (uploadError) throw uploadError;
      console.log('Upload successful.');
      // --- End Upload New Avatar ---

      // --- Get Public URL ---
      const { data: urlData } = supabase.storage
        .from('avatar-images')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for the uploaded image.');
      }
      publicUrl = urlData.publicUrl;
      console.log(`Public URL obtained: ${publicUrl}`);
      // --- End Get Public URL ---

      // --- Update Profile in DB ---
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        // Attempt to delete the orphaned image if DB update fails
        console.log(
          'DB update failed, attempting to remove uploaded image:',
          updateError,
        );
        Alert.alert(
          'Error',
          'Failed to update profile. Removing uploaded image...',
        );
        await supabase.storage.from('avatar-images').remove([filePath]);
        throw updateError;
      }
      console.log('Profile record updated successfully.');
      // --- End Update Profile ---

      // Update local state optimistically
      setUser((prevUser) =>
        prevUser ? { ...prevUser, avatar_url: publicUrl } : null,
      );
      setImage(publicUrl); // Update image state used for display

      Alert.alert('Success', 'Profile picture updated!');
      return publicUrl; // Return the URL on success
    } catch (error: any) {
      console.log('Image upload process error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'There was an error uploading the image.',
      );
      return null; // Return null on failure
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user || !user.avatar_url) {
      Alert.alert('Info', 'No profile picture to remove.');
      return;
    }

    Alert.alert(
      'Confirm Removal',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Extract file path from URL relative to the bucket
              const urlParts = user.avatar_url!.split('/avatar-images/'); // Non-null assertion ok due to check above
              if (urlParts.length <= 1) {
                throw new Error('Could not parse file path from avatar URL.');
              }
              const filePath = decodeURIComponent(urlParts[1]);
              console.log(`Attempting to remove avatar file: ${filePath}`);

              // 1. Remove from Storage
              const { error: storageError } = await supabase.storage
                .from('avatar-images')
                .remove([filePath]); // Pass the path relative to the bucket

              if (storageError) throw storageError;
              console.log(
                `Successfully removed avatar from storage: ${filePath}`,
              );

              // 2. Update Database
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user.id);

              if (updateError) throw updateError;
              console.log(
                'Profile record updated successfully (avatar_url set to null).',
              );

              // 3. Update Local State
              setUser((prev) => (prev ? { ...prev, avatar_url: null } : null));
              setImage(null);
              setAvatarModalVisible(false);
              Alert.alert('Success', 'Profile picture removed.');
            } catch (error: any) {
              console.log('Error removing avatar:', error);
              Alert.alert(
                'Error',
                `Failed to remove profile picture: ${error.message}`,
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // --- Item Resolution and Feedback Handlers ---
  const handleMarkItemResolved = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'resolved' })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state for immediate UI feedback
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, status: 'resolved' } : item,
        ),
      );
    } catch (error: any) {
      console.log('Error marking item as resolved:', error);
      Alert.alert('Error', error.message || 'Failed to update item status');
    }
  };

  const handleOpenResolvedModal = (itemId: string) => {
    setSelectedResolvedItemId(itemId);
    setShowResolvedModalResult(true);
  };

  const handleCloseResolvedModalResult = () => {
    setShowResolvedModalResult(false);
    setSelectedResolvedItemId(null);
  };

  const handleOpenFeedbackModal = (itemId: string) => {
    setSelectedItemIdForFeedback(itemId);
    setFeedbackModalVisible(true);
  };

  // Callback from FeedbackModal after successful DB submission
  const handleSubmitFeedback = async (feedbackDetails: {
    helperName: string;
    rating: number;
    experience: string;
  }) => {
    setFeedbackModalVisible(false); // Close the modal first

    if (selectedItemIdForFeedback) {
      const itemIdToUpdate = selectedItemIdForFeedback;
      setSelectedItemIdForFeedback(null); // Reset selected ID

      // Mark item as resolved in DB
      await handleMarkItemResolved(itemIdToUpdate);

      // Update local item state with feedback and resolved status
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id === itemIdToUpdate) {
            return {
              ...item,
              status: 'resolved',
              feedback: {
                // Add submitted feedback details
                helper_name: feedbackDetails.helperName,
                rating: feedbackDetails.rating,
                experience: feedbackDetails.experience,
                created_at: new Date().toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                }),
              },
            };
          }
          return item;
        }),
      );
    } else {
      console.warn(
        'handleSubmitFeedback called but selectedItemIdForFeedback was null',
      );
    }
  };

  // --- Settings / Bug Report / Contact Handlers ---
  // (Keep existing handlers: handleWhatsAppContact, handleSendEmail, handleEmailRedirect)
  const handleWhatsAppContact = () => {
    const phoneNumber = '+917483735082'; // Replace with actual number if different
    const defaultMessage = `Hello, I need help regarding the Lost & Found app.`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp. Is it installed?');
    });
  };

  const handleSendOtp = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'User email not found');
      return;
    }
    try {
      const response = await fetch(
        'https://otp-service-and-feedback-using-sq-lite.vercel.app/api/otp/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            type: 'numeric',
            organization: 'RVU Lost & Found',
            subject: 'OTP Verification',
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to send OTP');

      Alert.alert('Success', 'OTP has been sent to your email');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };

  const handleSendEmail = async () => {
    if (!contactMessage.trim()) {
      Alert.alert('Input Required', 'Please describe the bug or issue.');
      return;
    }
    setIsSending(true);
    try {
      // Enhance the message with more context
      const messageBody = `
          Bug Report/Feedback from Lost & Found App User:

          User Name: ${user?.full_name || 'Not Provided'}
          User Email: ${user?.email || 'Not Provided'}
          User ID: ${user?.id || 'Not Provided'}
          Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

          Message:
          ${contactMessage}
       `;

      // Use your backend endpoint
      const response = await fetch(
        'https://otp-service-and-feedback-using-sq-lite.vercel.app/api/feedback/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Adjust payload according to your backend API requirements
            name: user?.full_name || `User (${user?.id?.substring(0, 6)}...)`, // Provide a name
            email: user?.email, // Sender's email (if available)
            subject: 'Lost & Found App - Bug Report/Feedback', // Clear subject
            message: messageBody,
            // adminEmail: 'adevadiga2005@gmail.com' // Include if required by API
          }),
        },
      );

      // Check response status (important!)
      if (!response.ok) {
        // Try to parse error message from backend if possible
        let errorMessage = 'Failed to send the report due to a server error.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // Ignore if response body is not JSON or empty
        }
        throw new Error(errorMessage);
      }

      // Assuming response.ok means success
      Alert.alert(
        'Report Sent',
        'Thank you for your feedback! We will look into it.',
      );
      setIsBugModalOpen(false); // Close modal on success
      setContactMessage(''); // Clear message field
    } catch (error: any) {
      console.log('Email sending failed:', error);
      Alert.alert(
        'Sending Failed',
        error.message ||
          'Could not send the report. Please try again or use another contact method.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailRedirect = () => {
    const recipientEmail = 'adevadiga2005@gmail.com';
    const subject = encodeURIComponent('Inquiry from Lost & Found App User');
    const body = encodeURIComponent(`
         Hello,

         I have a question regarding the Lost & Found app.

         (User Email: ${user?.email || 'N/A'})

         My question is:
         [Please type your question here]

         Thank you
         Regards ${user?.full_name || ''}.
     `);
    const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch((err) => {
      console.log('Error opening mail app:', err);
      Alert.alert(
        'Error',
        'Could not open email app. Please check if you have one configured.',
      );
    });
  };

  // --- Helper Functions ---
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          color={i <= rating ? '#fbbf24' : '#e2e8f0'}
          fill={i <= rating ? '#fbbf24' : 'none'}
          style={styles.inlineStar}
        />,
      );
    }
    return <View style={styles.inlineStarsContainer}>{stars}</View>;
  };

  // --- Filtering Logic ---
  const getFilteredItems = () => {
    let filtered = items; // Start with all fetched items

    switch (activeFilter) {
      case 'lost':
        filtered = items.filter(
          (item) => item.type === 'lost' && item.status === 'active',
        );
        break;
      case 'found':
        filtered = items.filter(
          (item) => item.type === 'found' && item.status === 'active',
        );
        break;
      case 'resolved':
        filtered = items.filter((item) => item.status === 'resolved');
        break;
      case 'all':
      default:
        // Default 'all' shows active and resolved items only
        filtered = items.filter(
          (item) => item.status === 'active' || item.status === 'resolved',
        );
        break;
    }
    return filtered;
  };

  const filteredItems = getFilteredItems(); // Get the filtered list for rendering

  // --- Render Logic ---
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (!user && !loading) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.message}>Please sign in to view your profile.</Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.replace('/auth')}
        >
          <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user) return null; // Should not happen if logic above is correct

  // Helper to generate empty state message based on filter
  const getEmptyStateMessage = () => {
    switch (activeFilter) {
      case 'lost':
        return 'You have no active lost items.';
      case 'found':
        return 'You have no active found items.';
      case 'resolved':
        return 'You have no resolved items.';
      case 'all':
      default:
        return "You haven't posted any items yet, or all items are archived.";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0891b2"
        />
      }
      keyboardShouldPersistTaps="handled"
    >
      {/* --- Header Section --- */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => user.avatar_url && setSelectedImage(user.avatar_url)}
          disabled={!user.avatar_url}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Camera size={24} color="#94a3b8" />
            </View>
          )}
          <TouchableOpacity
            style={styles.avatarOverlay}
            onPress={() => setAvatarModalVisible(true)}
          >
            <Edit2 size={14} color="#ffffff" />
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
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleUpdateProfile}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
              >
                <Save size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                {user.full_name || 'Update Name'}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setEditedName(user.full_name || '');
                  setIsEditing(true);
                }}
              >
                <Edit2 size={16} color="#0891b2" />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.email} numberOfLines={1} ellipsizeMode="tail">
            {user.email}
          </Text>
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

      {/* --- Stats Section --- */}
      <View style={styles.stats}>
        {/* Stats remain based on the *total* items state */}
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {
              items.filter(
                (item) => item.type === 'lost' && item.status === 'active',
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Active Lost</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {
              items.filter(
                (item) => item.type === 'found' && item.status === 'active',
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

      {/* --- Filter Buttons Section --- */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setActiveFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'lost' && styles.filterButtonActive,
          ]}
          onPress={() => setActiveFilter('lost')}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'lost' && styles.filterButtonTextActive,
            ]}
          >
            Active Lost
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'found' && styles.filterButtonActive,
          ]}
          onPress={() => setActiveFilter('found')}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'found' && styles.filterButtonTextActive,
            ]}
          >
            Active Found
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === 'resolved' && styles.filterButtonActive,
          ]}
          onPress={() => setActiveFilter('resolved')}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === 'resolved' && styles.filterButtonTextActive,
            ]}
          >
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Items Section --- */}
      <View style={styles.section}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Package size={20} color="#0891b2" />
          <Text style={styles.sectionTitle}>My Items</Text>
          {/* Optional: Show count of filtered items. Uncomment if desired. */}
          {/* <Text style={styles.itemCount}>{filteredItems.length} item(s)</Text> */}
        </View>

        {/* Conditional Rendering: Show list or empty message */}
        {filteredItems.length > 0 ? (
          // Map over the pre-filtered 'filteredItems' array
          filteredItems.map((item) => {
            // Type assertion to get the single feedback object (or null)
            const itemFeedback = item.feedback as Feedback | null;

            return (
              // Item Card Container
              <View key={item.id} style={styles.itemCard}>
                {/* Left Column: Item Information */}
                <View style={styles.itemInfoColumn}>
                  {/* Item Title */}
                  <Text
                    style={styles.itemTitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                  {/* Meta Row: Type Badge and Status/Feedback */}
                  <View style={styles.itemMeta}>
                    {/* Type Badge ('LOST' or 'FOUND') */}
                    <Text
                      style={[
                        styles.itemType,
                        item.type === 'lost'
                          ? styles.lostBadge
                          : styles.foundBadge,
                      ]}
                    >
                      {item.type.toUpperCase()}
                    </Text>
                    {/* Status Display: Checks if item is resolved */}
                    {item.status === 'resolved' ? (
                      // If Resolved: Show feedback summary or 'RESOLVED' text
                      <TouchableOpacity
                        style={styles.resolvedStatusContainer}
                        onPress={() => handleOpenResolvedModal(item.id)} // Opens modal with full feedback details
                      >
                        {itemFeedback ? (
                          // If feedback exists, show stars and helper name
                          <>
                            {renderStars(itemFeedback.rating)}
                            <Text
                              style={styles.resolvedHelperName}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              by {itemFeedback.helper_name}
                            </Text>
                          </>
                        ) : (
                          // If no feedback, show 'RESOLVED' text
                          <Text style={styles.resolvedStatusText}>
                            RESOLVED
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      // If Active: Show 'ACTIVE' status text
                      <Text
                        style={[styles.itemStatus, styles.activeStatusText]}
                      >
                        {item.status.toUpperCase()}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Right Column: Action Button (only for 'active' items) */}
                {item.status === 'active' && (
                  <View style={styles.itemActionColumn}>
                    <TouchableOpacity
                      style={styles.resolveButton}
                      onPress={() => handleOpenFeedbackModal(item.id)} // Opens the feedback modal
                    >
                      <Text style={styles.resolveButtonText}>
                        {/* Button text depends on item type */}
                        {item.type === 'lost' ? 'Found It' : 'Reclaimed'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View> // End Item Card
            );
          }) // End .map()
        ) : (
          // If 'filteredItems' is empty, show the appropriate message
          <Text style={styles.emptyText}>{getEmptyStateMessage()}</Text>
        )}
      </View>
      {/* --- End Items Section --- */}

      {/* --- Modals --- */}

      {/* Settings Drawer Modal - Ensure no stray text here */}
      <Modal
        visible={isSettingsOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPressOut={() => setIsSettingsOpen(false)}
        >
          {/* Added TouchableOpacity with activeOpacity={1} to prevent taps inside from closing */}
          <TouchableOpacity activeOpacity={1} style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Settings & Support</Text>
              <TouchableOpacity
                onPress={() => setIsSettingsOpen(false)}
                style={styles.closeButtonDrawer}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                setIsSettingsOpen(false);
                setIsPasswordModalOpen(true);
                handleSendOtp();
              }}
            >
              <Lock size={20} color="#64748b" />
              <Text style={styles.drawerItemText}>Forgot Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                setIsSettingsOpen(false);
                setIsResetModalOpen(true);
              }}
            >
              <KeyRound size={20} color="#64748b" />
              <Text style={styles.drawerItemText}>Update Password</Text>
            </TouchableOpacity>
            <View style={styles.drawerSeparator} />
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                setIsSettingsOpen(false);
                setIsBugModalOpen(true);
              }}
            >
              <Bug size={20} color="#64748b" />
              <Text style={styles.drawerItemText}>Report Bug / Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleEmailRedirect}
            >
              <Mail size={20} color="#64748b" />
              <Text style={styles.drawerItemText}>Contact via Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleWhatsAppContact}
            >
              <MessageCircle size={20} color="#64748b" />
              <Text style={styles.drawerItemText}>Contact via WhatsApp</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          {/* End inner TouchableOpacity */}
        </TouchableOpacity>
      </Modal>

      {/* Bug Report Modal */}
      <Modal
        visible={isBugModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isSending) setIsBugModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Bug / Feedback</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please describe the issue or provide your feedback..."
              placeholderTextColor="#94a3b8"
              value={contactMessage}
              onChangeText={setContactMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isSending}
            />
            <TouchableOpacity
              style={[styles.button, isSending && styles.disabledButton]}
              onPress={handleSendEmail}
              disabled={isSending || !contactMessage.trim()}
            >
              <Text style={styles.buttonText}>
                {isSending ? 'Sending...' : 'Send Report'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                if (!isSending) setIsBugModalOpen(false);
              }}
              disabled={isSending}
            >
              <Text
                style={[
                  styles.modalCancelButtonText,
                  isSending && styles.disabledText,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Modals Component */}
      <PasswordModals
        isPasswordModalOpen={isPasswordModalOpen}
        setIsPasswordModalOpen={setIsPasswordModalOpen}
        isResetModalOpen={isResetModalOpen}
        setIsResetModalOpen={setIsResetModalOpen}
        user={user}
        styles={styles}
      />

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Avatar Edit Options Modal */}
      <Modal
        visible={isAvatarModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.avatarModalOverlay}
          activeOpacity={1}
          onPressOut={() => setAvatarModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.avatarModalContent}>
            <Text style={styles.avatarModalTitle}>Change Profile Picture</Text>
            <TouchableOpacity
              style={styles.avatarModalOption}
              onPress={handleTakePhoto}
            >
              <Camera
                size={20}
                color="#0891b2"
                style={styles.avatarModalIcon}
              />
              <Text style={styles.avatarModalText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarModalOption}
              onPress={handleImagePick}
            >
              <Edit2 size={20} color="#0891b2" style={styles.avatarModalIcon} />
              <Text style={styles.avatarModalText}>Choose from Library</Text>
            </TouchableOpacity>
            {image && (
              <>
                <View style={styles.avatarModalSeparator} />
                <TouchableOpacity
                  style={styles.avatarModalOption}
                  onPress={handleDeleteAvatar}
                >
                  <Trash
                    size={20}
                    color="#ef4444"
                    style={styles.avatarModalIcon}
                  />
                  <Text style={[styles.avatarModalText, { color: '#ef4444' }]}>
                    Remove Picture
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.avatarModalSeparator} />
            <TouchableOpacity
              style={styles.avatarModalCancel}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={styles.avatarModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Feedback Modal (Rendered once) */}
      <FeedbackModal
        isVisible={feedbackModalVisible}
        onClose={() => {
          setFeedbackModalVisible(false);
          setSelectedItemIdForFeedback(null);
        }}
        onSubmit={handleSubmitFeedback}
        type={
          items.find((item) => item.id === selectedItemIdForFeedback)?.type ??
          'lost'
        }
        itemId={selectedItemIdForFeedback ?? ''}
      />

      {/* Resolved Item Details Modal (Rendered once) */}
      <ResolvedItemDetailsModal
        isVisible={showResolvedModalResult}
        onClose={handleCloseResolvedModalResult}
        itemId={selectedResolvedItemId ?? ''}
      />
    </ScrollView>
  );
}

// --- Styles --- (Add styles for filter buttons)
const styles = StyleSheet.create({
  // Containers
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e2e8f0',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 4,
  },
  profileInfo: { flex: 1, justifyContent: 'center' },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginRight: 6 },
  editButton: { padding: 2 },
  email: { fontSize: 14, color: '#64748b' },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    marginRight: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  saveButton: { backgroundColor: '#0891b2', padding: 6, borderRadius: 15 },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, marginLeft: 5 },
  // Stats
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 10,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  // Filter Buttons Section NEW
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Distribute buttons evenly
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff', // Match other sections or use a slightly different bg
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 10, // Space before items list
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15, // Pill shape
    borderWidth: 1,
    borderColor: '#cbd5e1', // Default border color
    backgroundColor: '#f8fafc', // Default background
  },
  filterButtonActive: {
    backgroundColor: '#e0f7fe', // Active background color (light cyan)
    borderColor: '#0891b2', // Active border color (cyan)
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569', // Default text color
  },
  filterButtonTextActive: {
    color: '#0e7490', // Active text color (darker cyan)
  },
  // Section Headers
  section: { backgroundColor: '#ffffff', marginBottom: 10, paddingBottom: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 10,
  },
  itemCount: { fontSize: 12, color: '#64748b', marginLeft: 'auto' }, // Optional item count style
  // Item Card
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemInfoColumn: { flex: 1, marginRight: 10 },
  itemActionColumn: {},
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 6,
  },
  itemMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  itemType: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  lostBadge: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  foundBadge: { backgroundColor: '#dcfce7', color: '#166534' },
  itemStatus: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  activeStatusText: {
    color: '#0e7490',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#e0f7fe',
  },
  resolvedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    borderRadius: 4,
  },
  resolvedStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#16a34a',
    textTransform: 'uppercase',
    textDecorationLine: 'underline',
  }, // Added underline
  resolvedHelperName: {
    fontSize: 11,
    color: '#52525b',
    marginLeft: 4,
    textDecorationLine: 'underline',
  }, // Added underline
  inlineStarsContainer: { flexDirection: 'row', marginRight: 4 },
  inlineStar: { marginRight: 1 },
  resolveButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  resolveButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '500' },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: 20,
    fontSize: 14,
  },
  // General Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    paddingTop: 40,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e293b',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#1e293b',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' }, // Use minHeight for multiline
  button: {
    backgroundColor: '#0891b2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#a5f3fc', opacity: 0.7 },
  disabledText: { opacity: 0.7 },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelButtonText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  closeModalButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  }, // zIndex helps ensure it's tappable

  // Settings Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  drawerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  closeButtonDrawer: { padding: 5 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  drawerItemText: { fontSize: 16, color: '#334155', marginLeft: 15 },
  drawerSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 5,
    marginHorizontal: 20,
  },

  // Image Viewer Modal
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: { width: '95%', height: '85%' },
  // Avatar Edit Modal
  avatarModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  avatarModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  avatarModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 15,
    color: '#1e293b',
  },
  avatarModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  avatarModalIcon: { marginRight: 15 },
  avatarModalText: { fontSize: 16, color: '#334155' },
  avatarModalSeparator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 5,
    marginHorizontal: 20,
  },
  avatarModalCancel: { paddingVertical: 15, alignItems: 'center' },
  avatarModalCancelText: { fontSize: 16, color: '#0891b2', fontWeight: '600' },
  // Other shared styles
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  message: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  signInButton: {
    marginTop: 20,
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  signInButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1', // Example border color
    borderRadius: 8,
    marginBottom: 15, // Example spacing
    backgroundColor: '#fff', // Example background
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input_new: {
    flex: 1, // Take remaining space
    height: 45, // Example height
    fontSize: 16,
    color: '#1e293b', // Example text color
  },
  eyeIcon: {
    padding: 5, // Add padding for easier tapping
  },
});
