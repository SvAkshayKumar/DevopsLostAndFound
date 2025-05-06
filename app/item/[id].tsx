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
  ActivityIndicator,
  Switch, // Ensure Switch is imported
} from 'react-native';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  MessageCircle,
  Edit2,
  X,
  Camera,
  Save,
  ImagePlus,
  Trash2,
  Flag,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// --- Type Definitions ---
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
  contacted_by: string; // Email string
  method: string;
  created_at: string;
};

type Profile = {
  phone_number: string | null;
  full_name?: string | null;
  email?: string | null;
};
// --- End Type Definitions ---

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedType, setEditedType] = useState<'lost' | 'found'>('lost');
  const [isImagePickerVisible, setImagePickerVisible] = useState(false);

  // Report states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abuseReasons = [
    'Scam or fraud',
    'Inappropriate content',
    'Spam or misleading',
    'Violates rules',
    'Harassment',
    'Other',
  ];

  // --- useEffect for Initialization and Subscription ---
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // Start loading only if not already loading
      if (isMounted && !isLoading) {
         setIsLoading(true);
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const currentUserId = user?.id || null;
        if (isMounted) setCurrentUser(currentUserId);

        if (id && isMounted) {
          await fetchItem(currentUserId, id);
          await fetchContacts(id);
        } else if (!id && isMounted) {
          Alert.alert('Error', 'Item ID is missing.');
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }
      } catch (error) {
        console.error('Initialization error:', error);
        if (isMounted) Alert.alert('Error', 'Failed to initialize screen.');
      } finally {
        // Set loading false only if mounted
        if (isMounted) setIsLoading(false);
      }
    };

    initialize();

    // Subscription logic
    let channel: any = null;
    if (id) {
      channel = supabase
        .channel(`contact_attempts_item_${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contact_attempts',
            filter: `item_id=eq.${id}`,
          },
          (payload) => {
            console.log('Contact attempt change received!', payload);
            if (isMounted && id) fetchContacts(id); // Re-fetch contacts
          },
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED')
            console.log(`Subscribed to contact attempts for item ${id}`);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err)
            console.error(`Subscription error for item ${id}:`, status, err);
        });
    }

    return () => {
      // Cleanup
      isMounted = false;
      if (channel) {
        supabase
          .removeChannel(channel)
          .then(() => console.log(`Unsubscribed from channel for item ${id}`))
          .catch((err) =>
            console.error(
              `Error unsubscribing from channel for item ${id}:`,
              err,
            ),
          );
      }
    };
  }, [id]); // Dependency array

  // --- Fetch Functions ---
  const fetchItem = async (currentUserId: string | null, itemId: string) => {
    console.log(`Fetching item: ${itemId}`);
    try {
      const { data: itemData, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;

      if (itemData) {
        setItem(itemData);
        setIsOwner(currentUserId === itemData.user_id);
        setEditedTitle(itemData.title);
        setEditedDescription(itemData.description);
        setEditedType(itemData.type);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', itemData.user_id)
          .maybeSingle();

        if (profileError)
          console.error('Error fetching owner profile:', profileError.message);
        setOwnerProfile(profileData);
      } else {
        Alert.alert('Not Found', 'Item not found.');
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }
    } catch (error: any) {
      console.error('Error fetching item details:', error.message);
      Alert.alert('Error', 'Could not fetch item details.');
      // Optionally navigate back on fetch error
      // if (router.canGoBack()) router.back(); else router.replace('/');
    }
  };

  const fetchContacts = async (itemId: string) => {
    console.log(`Fetching contacts for item: ${itemId}`);
    try {
      const { data, error } = await supabase
        .from('contact_attempts')
        .select(`id, method, created_at, contacted_by_user: contacted_by (email)`)
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedContacts: Contact[] = (data || []).map((c: any) => ({
        id: c.id,
        contacted_by: c.contacted_by_user?.email || 'Email unavailable',
        method: c.method,
        created_at: c.created_at,
      }));
      setContacts(formattedContacts);
    } catch (error: any) {
      console.error('Error fetching contacts:', error.message);
      setContacts([]); // Reset on error
    }
  };

  // --- Handlers ---
  const startEditing = () => {
    if (!item) return;
    setEditedTitle(item.title);
    setEditedDescription(item.description);
    setEditedType(item.type);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    // Optionally reset fields to original item values if desired
    // if (item) {
    //   setEditedTitle(item.title);
    //   setEditedDescription(item.description);
    //   setEditedType(item.type);
    // }
  };

  const handleSaveChanges = async () => {
    if (!item) return;
    const trimmedTitle = editedTitle.trim();
    const trimmedDesc = editedDescription.trim();

    if (!trimmedTitle || !trimmedDesc) {
      return Alert.alert('Validation Error', 'Title and description cannot be empty.');
    }

    if (
      trimmedTitle === item.title &&
      trimmedDesc === item.description &&
      editedType === item.type
    ) {
      setIsEditing(false); // No changes
      return;
    }

    setIsLoading(true);
    try {
      const { data: updatedItem, error } = await supabase
        .from('items')
        .update({
          title: trimmedTitle,
          description: trimmedDesc,
          type: editedType,
        })
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;

      if (updatedItem) {
        setItem(updatedItem as Item); // Update with returned data
      } else {
        // Fallback: Optimistic update if select fails
        setItem((prev) =>
          prev ? { ...prev, title: trimmedTitle, description: trimmedDesc, type: editedType } : null,
        );
      }
      setIsEditing(false);
      Alert.alert('Success', 'Item details updated successfully');
    } catch (error: any) {
      console.error('Error updating item:', error);
      Alert.alert('Error', `Failed to update item details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Other Handlers (Keep logic, ensure console.error on errors) ---
  const handleReportItem = () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to report an item.', [
        { text: 'OK', onPress: () => router.push('/auth') },
      ]);
      return;
    }
    setSelectedReason('');
    setReportDescription('');
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
     if (!item || !currentUser) return;
     if (!selectedReason) { Alert.alert("Validation Error", "Please select a reason."); return; }
     if (selectedReason === 'Other' && !reportDescription.trim()) { Alert.alert("Validation Error", "Please provide a description for 'Other'."); return; }
     setIsSubmitting(true);
     try {
         const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name, email').eq('id', currentUser).single();
         if (profileError || !profile?.email) { console.error('Error fetching reporter profile/email:', profileError); throw new Error("Could not retrieve your user details."); }
         const { error: insertError } = await supabase.from('reports').insert([{ item_id: item.id, reported_by_email: profile.email, item_owner_email: item.user_email, report_reason: selectedReason, report_description: reportDescription.trim() || null, status: 'pending' }]);
         if (insertError) { console.error('Error inserting report:', insertError); throw new Error("Could not submit the report to the database."); }
         const emailPayload = { name: profile.full_name || 'User', adminEmail: 'adevadiga2005@gmail.com', reporter_email: profile.email, reason: selectedReason, description: reportDescription.trim(), item_owner_email: item.user_email, item_details: { id: item.id, title: item.title, /* ... */ } };
         const res = await fetch('https://otp-service-and-feedback-using-sq-lite.vercel.app/api/report/item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emailPayload) });
         if (!res.ok) { const errorData = await res.text(); console.error('Failed to send report email:', res.status, errorData); Alert.alert("Report Submitted (Email Failed)", "Report saved, but notification failed. Contact support if needed."); }
         else { Alert.alert("Success", "Report submitted successfully."); router.replace('/'); }
         setReportModalVisible(false);
     } catch (error: any) {
         console.error('Report submission error:', error);
         Alert.alert("Error", `Report submission failed: ${error.message}`);
     } finally {
         setIsSubmitting(false);
     }
  };

  const handleContact = async (method: string) => {
     if (!currentUser) { Alert.alert('Login Required', 'Please login...', [{ text: 'OK', onPress: () => router.push('/auth') }]); return; }
     if (!item) return Alert.alert("Error", "Item details missing.");
     let contactDetail: string | null = null, urlScheme: string | null = null, actionDescription = '';
     const ownerEmail = item.user_email;
     const phoneNum = ownerProfile?.phone_number;
     switch (method) {
      case 'phone':
        contactDetail = ownerProfile?.phone_number || null;
        if (contactDetail) urlScheme = `tel:${contactDetail}`;
        actionDescription = 'call';
        break;
    case 'email':
        contactDetail = ownerEmail;
        if (contactDetail) urlScheme = `mailto:${contactDetail}?subject=Regarding your item: ${encodeURIComponent(item.title)}`;
         actionDescription = 'email';
        break;
    case 'sms':
        contactDetail = ownerProfile?.phone_number || null;
        if (contactDetail) urlScheme = `sms:${contactDetail}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(`Hello, I'm contacting you about the item '${item.title}' listed on Lost&Found.`)}`;
         actionDescription = 'SMS';
        break;
    case 'whatsapp':
        contactDetail = ownerProfile?.phone_number || null;
        if (contactDetail) {
            const whatsappNumber = contactDetail.replace(/[^0-9]/g, ''); // Basic cleaning
            urlScheme = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello, I'm contacting you about the item '${item.title}' listed on Lost&Found.`)}`;
        }
        actionDescription = 'WhatsApp';
        break;
         default: return Alert.alert("Error", "Invalid method.");
     }
     if (!contactDetail) return Alert.alert('Not Available', `Owner details for ${method} unavailable.`);
     if (!urlScheme) return Alert.alert("Error", "Could not generate link.");
     try {
         const { error: insertError } = await supabase.from('contact_attempts').insert({ contacted_by: currentUser, posted_user_id: item.user_id, item_id: item.id, method: method });
         if (insertError) { console.warn('Error recording contact attempt:', insertError); Alert.alert('Notice', 'Could not record attempt, proceeding anyway.'); }
         const canOpen = await Linking.canOpenURL(urlScheme);
         if (canOpen) await Linking.openURL(urlScheme);
         else Alert.alert('Cannot Open Link', `Could not ${actionDescription}. App might not be installed.`);
     } catch (error) {
         console.error('Error during contact process:', error);
         Alert.alert('Error', `Failed to initiate ${method}.`);
     }
  };

  const handleImagePick = async () => {
     setImagePickerVisible(false);
     try {
         const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
         if (status !== 'granted') return Alert.alert('Permission Denied', 'Storage permission is required.');
         const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 });
         if (!result.canceled && result.assets?.[0]) await uploadImage(result.assets[0].uri);
     } catch (error: any) {
         console.error('Error picking image:', error);
         Alert.alert('Error', `Image pick failed: ${error.message}`);
     }
  };

  const handleTakePhoto = async () => {
     setImagePickerVisible(false);
     try {
         const { status } = await ImagePicker.requestCameraPermissionsAsync();
         if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera permission is required.');
         const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
         if (!result.canceled && result.assets?.[0]) await uploadImage(result.assets[0].uri);
     } catch (error: any) {
         console.error('Error taking photo:', error);
         Alert.alert('Error', `Take photo failed: ${error.message}`);
     }
  };

  const uploadImage = async (uri: string) => {
     if (!id || !currentUser) return Alert.alert("Error", "Missing ID or user session.");
     setIsLoading(true);
     try {
         const fileInfo = await FileSystem.getInfoAsync(uri);
         if (!fileInfo.exists) throw new Error('Selected file does not exist.');
         const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
         if (!['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) throw new Error('Invalid file type (JPG, PNG, GIF allowed).');
         const fileName = `${currentUser}_${Date.now()}.${fileExt}`;
         const filePath = `public/${fileName}`;
         const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
         const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
         const { error: uploadError } = await supabase.storage.from('item-images').upload(filePath, Buffer.from(base64, 'base64'), { contentType, cacheControl: '3600', upsert: false });
         if (uploadError) throw uploadError;
         const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(filePath);
         if (!urlData?.publicUrl) throw new Error("Could not retrieve public URL.");
         const publicUrl = urlData.publicUrl;
         // Delete Old Image (if exists)
         if (item?.image_url) {
             try {
                 const oldUrlParts = item.image_url.split('/item-images/');
                 if (oldUrlParts.length > 1) {
                     const oldFilePath = decodeURIComponent(oldUrlParts[1]);
                     console.log(`Attempting to delete old image: ${oldFilePath}`);
                     await supabase.storage.from('item-images').remove([oldFilePath]);
                 }
             } catch (deleteError: any) {
                 console.warn("Could not delete old image (continuing):", deleteError.message);
             }
         }
         // Update DB
         const { error: updateError } = await supabase.from('items').update({ image_url: publicUrl }).eq('id', id);
         if (updateError) {
             console.error("DB update error after upload:", updateError);
             try { await supabase.storage.from('item-images').remove([filePath]); console.log("Cleaned up orphaned image."); }
             catch (cleanupError: any) { console.error("Failed to cleanup orphaned image:", cleanupError.message); }
             throw updateError;
         }
         // Success: Update local state
         setItem((prev) => (prev ? { ...prev, image_url: publicUrl } : null));
         Alert.alert('Success', 'Image updated successfully!');
     } catch (error: any) {
         console.error('Image upload process error:', error);
         Alert.alert('Upload Failed', `Error: ${error.message}`);
     } finally {
         setIsLoading(false);
     }
  };

  const confirmAndDelete = async () => {
     if (!item || !id) return;
     setIsLoading(true);
     console.log(`Attempting final deletion for item ${item.id}`);
     try {
         // 1. Delete image (best effort)
         if (item.image_url) {
             try {
                 const urlParts = item.image_url.split('/item-images/');
                 if (urlParts.length > 1) {
                     const filePath = decodeURIComponent(urlParts[1]);
                     console.log(`Deleting image file: ${filePath}`);
                     const { error: storageError } = await supabase.storage.from('item-images').remove([filePath]);
                     if (storageError) console.warn(`Could not delete image (continuing): ${storageError.message}`);
                     else console.log(`Successfully deleted image: ${filePath}`);
                 }
             } catch (imgDelErr: any) {
                 console.warn(`Error parsing/deleting image (continuing): ${imgDelErr.message}`);
             }
         }
         // 2. Delete item (critical)
         console.log(`Deleting item record: ${item.id}`);
         const { error: dbError } = await supabase.from('items').delete().eq('id', item.id);
         if (dbError) throw dbError; // Fail fast if DB delete fails
         // 3. Success Navigation
         console.log(`Successfully deleted item: ${item.id}`);
         Alert.alert('Deleted', 'Item has been deleted successfully.');
         router.replace('/'); // Navigate home
     } catch (error: any) {
         console.error('Error during deletion process:', error);
         Alert.alert('Error', `Failed to delete the item: ${error.message}`);
         setIsLoading(false); // Only stop loading on error (success navigates away)
     }
  };

  const handleDeleteRequest = () => {
     if (!item) return;
     Alert.alert(
         'Confirm Deletion',
         'Are you sure you want to permanently delete this item? This action cannot be undone.',
         [
             { text: 'Cancel', style: 'cancel' },
             { text: 'Delete', style: 'destructive', onPress: confirmAndDelete },
         ],
         { cancelable: true },
     );
  };

  const handleDeleteImage = () => {
     if (!item?.image_url || !id) return Alert.alert('No Image', 'There is no image to delete.');
     Alert.alert(
         'Delete Image Confirmation',
         'Are you sure you want to delete the image for this item?',
         [
             { text: 'Cancel', style: 'cancel' },
             {
                 text: 'Delete Image',
                 style: 'destructive',
                 onPress: async () => {
                     setIsLoading(true);
                     console.log(`Attempting to delete image: ${item.image_url}`);
                     try {
                         const urlParts = item.image_url!.split('/item-images/');
                         if (urlParts.length <= 1) throw new Error("Could not parse image path.");
                         const filePath = decodeURIComponent(urlParts[1]);
                         // 1. Remove from Storage
                         const { error: storageError } = await supabase.storage.from('item-images').remove([filePath]);
                         if (storageError) throw storageError;
                         console.log(`Deleted image from storage: ${filePath}`);
                         // 2. Update DB (set null)
                         const { error: dbError } = await supabase.from('items').update({ image_url: null }).eq('id', id);
                         if (dbError) {
                             console.error('DB update failed after image deletion:', dbError);
                             throw new Error(`Database update failed: ${dbError.message}. Image was deleted from storage, but DB link remains.`);
                         }
                         console.log(`Set image_url to null in DB for item ${id}.`);
                         // 3. Update local state
                         setItem((prev) => (prev ? { ...prev, image_url: null } : null));
                         Alert.alert('Image Deleted', 'Item image removed successfully.');
                     } catch (err: any) {
                         console.error('Delete image error:', err);
                         Alert.alert('Error', `Failed to delete image: ${err.message}`);
                     } finally {
                         setIsLoading(false);
                     }
                 },
             },
         ],
         { cancelable: true },
     );
  };

  // --- Render Logic ---

  // ** Strengthened Initial Loading State **
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0891b2" />
        {/* Ensure text is inside Text component */}
        <Text style={styles.loadingText}>Loading Item...</Text>
      </View>
    );
  }

  // ** Strengthened Item Not Found State **
  if (!item) {
    return (
      <View style={[styles.container, styles.centered]}>
        {/* Ensure text is inside Text component */}
        <Text style={styles.errorText}>Item not found or could not be loaded.</Text>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.backButtonFallback}
        >
          <Text style={styles.backButtonFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ** Main Render **
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.backButton}
          disabled={isLoading} // Keep disabled during background loading too
        >
          <ArrowLeft size={24} color="#0891b2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {isEditing ? 'Edit Item' : item.title}
        </Text>
        {isOwner && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (isEditing) handleSaveChanges();
              else startEditing();
            }}
            disabled={isLoading}
          >
            {isEditing ? (
              <Save size={24} color="#0891b2" />
            ) : (
              <Edit2 size={24} color="#0891b2" />
            )}
          </TouchableOpacity>
        )}
        {!isOwner && <View style={styles.headerPlaceholder} />}
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Image Section */}
        {item.image_url ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
            {isOwner && isEditing && (
              <View style={styles.imageActionsOverlay}>
                <TouchableOpacity
                  style={styles.imageActionButton}
                  onPress={() => !isLoading && setImagePickerVisible(true)}
                  disabled={isLoading}
                >
                  <View style={styles.iconTextContainer}>
                    <Camera size={20} color="#ffffff" />
                    <Text style={styles.imageActionText}>Change</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageActionButton, styles.deleteImageButton]}
                  onPress={() => !isLoading && handleDeleteImage()}
                  disabled={isLoading}
                >
                  <View style={styles.iconTextContainer}>
                    <Trash2 size={20} color="#ffffff" />
                    <Text style={styles.imageActionText}>Delete</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // No Image
          isOwner && isEditing ? (
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={() => !isLoading && setImagePickerVisible(true)}
              disabled={isLoading}
            >
              <View style={styles.iconTextContainer_vertical}>
                <ImagePlus size={32} color="#0891b2" />
                <Text style={styles.addImageText}>Add Image</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePlaceholderContainer}>
              <ImagePlus size={40} color="#cbd5e1" />
              <Text style={styles.placeholderText}>No Image Provided</Text>
            </View>
          )
        )}

        {/* Details Section */}
        <View style={styles.details}>
          {/* Show Badges/Actions only when NOT editing */}
          {!isEditing && (
            <View style={styles.typeContainer}>
              <View style={styles.statusBadgeContainer}>
                <Text
                  style={[
                    styles.statusBadge,
                    item.type === 'lost' ? styles.lostBadge : styles.foundBadge,
                  ]}
                >
                  {item.type.toUpperCase()}
                </Text>
                {item.status === 'resolved' && (
                  <Text style={[styles.statusBadge, styles.resolvedBadge]}>
                    RESOLVED
                  </Text>
                )}
              </View>
              {/* Action Buttons */}
              {isOwner ? (
                <TouchableOpacity
                  onPress={() => !isLoading && handleDeleteRequest()}
                  style={styles.headerActionButton}
                  disabled={isLoading}
                >
                  <View style={styles.iconTextContainer}>
                    <Trash2 size={20} color="#ef4444" />
                    <Text style={[styles.headerActionText, { color: '#ef4444' }]}>
                      Delete Item
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                currentUser && (
                  <TouchableOpacity
                    onPress={() => !isLoading && handleReportItem()}
                    style={styles.headerActionButton}
                    disabled={isLoading}
                  >
                    <View style={styles.iconTextContainer}>
                      <Flag size={20} color="#f97316" />
                      <Text style={[styles.headerActionText, { color: '#f97316' }]}>
                        Report
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}

          {/* Edit Mode vs Display Mode */}
          {isEditing ? (
            <>
              {/* Type Toggle Section */}
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Item Type</Text>
                <View style={styles.switchContainer}>
                  <Text
                    style={[
                      styles.switchLabel,
                      editedType === 'lost' && styles.switchLabelActive,
                    ]}
                  >
                    Lost
                  </Text>
                  <Switch
                    trackColor={{ false: '#fecaca', true: '#a5f3fc' }}
                    thumbColor={editedType === 'found' ? '#0891b2' : '#ef4444'}
                    ios_backgroundColor="#e5e7eb"
                    onValueChange={(newValue) =>
                      setEditedType(newValue ? 'found' : 'lost')
                    }
                    value={editedType === 'found'}
                    disabled={isLoading}
                  />
                  <Text
                    style={[
                      styles.switchLabel,
                      editedType === 'found' && styles.switchLabelActive,
                    ]}
                  >
                    Found
                  </Text>
                </View>
              </View>

              {/* Title Input Section */}
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Title</Text>
                <TextInput
                  style={styles.editInput}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Enter item title"
                  maxLength={100}
                  editable={!isLoading}
                />
              </View>

              {/* Description Input Section */}
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Description</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Enter item description"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                  editable={!isLoading}
                />
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={cancelEditing} // Use cancel function
                disabled={isLoading}
              >
                <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Display Mode Text
            <View style={styles.textContainer}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.meta}>
                Posted on{' '}
                {new Date(item.created_at).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Contacts List (Owner) or Contact Options (Others) */}
        {/* Show only when NOT editing */}
        {!isEditing &&
          (isOwner ? (
            <View style={styles.contactsSection}>
              <Text style={styles.sectionTitle}>Contact Attempts</Text>
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <View key={contact.id} style={styles.contactItem}>
                    <View style={styles.contactInfo}>
                      <Text
                        style={styles.contactEmail}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {contact.contacted_by}
                      </Text>
                      <Text style={styles.contactMethod}>
                        Method: {contact.method}
                      </Text>
                    </View>
                    <Text style={styles.contactTime}>
                      {new Date(contact.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noContacts}>
                  No one has tried to contact you yet.
                </Text>
              )}
            </View>
          ) : (
            // Not Owner - Contact Options
            currentUser && ( // Only show if logged in
              <View style={styles.contactOptions}>
                <Text style={styles.sectionTitle}>Contact Owner</Text>
                {!ownerProfile?.phone_number && !item.user_email ? (
                  <Text style={styles.noContacts}>
                    Owner has not provided contact info.
                  </Text>
                ) : (
                  <>
                    {/* Phone options */}
                    {ownerProfile?.phone_number && (
                      <>
                        <TouchableOpacity
                          style={styles.contactButton}
                          onPress={() => handleContact('phone')}
                          disabled={isLoading}
                        >
                          <View style={styles.iconTextContainer}>
                            <Phone size={20} color="#0891b2" />
                            <Text style={styles.contactButtonText}>Call Owner</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.contactButton}
                          onPress={() => handleContact('whatsapp')}
                          disabled={isLoading}
                        >
                          <View style={styles.iconTextContainer}>
                            <MessageCircle size={20} color="#25D366" />
                            <Text style={styles.contactButtonText}>
                              Send WhatsApp
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.contactButton}
                          onPress={() => handleContact('sms')}
                          disabled={isLoading}
                        >
                          <View style={styles.iconTextContainer}>
                            <MessageSquare size={20} color="#0891b2" />
                            <Text style={styles.contactButtonText}>Send SMS</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    )}
                    {/* Email option */}
                    {item.user_email && (
                      <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => handleContact('email')}
                        disabled={isLoading}
                      >
                        <View style={styles.iconTextContainer}>
                          <Mail size={20} color="#0891b2" />
                          <Text style={styles.contactButtonText}>Send Email</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )
          ))}

        {/* Spacer */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* --- Modals --- */}

      {/* Image Picker Modal */}
      <Modal
        visible={isImagePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setImagePickerVisible(false)} // Close on press outside
        >
          {/* Use View for content, not TouchableOpacity */}
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Image Source</Text>
            <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
              <View style={styles.iconTextContainer}>
                <Camera size={24} color="#0891b2" style={styles.modalIcon} />
                <Text style={styles.modalOptionText}>Take Photo</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={handleImagePick}>
              <View style={styles.iconTextContainer}>
                <ImagePlus size={24} color="#0891b2" style={styles.modalIcon} />
                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.modalSeparator} />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setImagePickerVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Abuse Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSubmitting && setReportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay2}
          activeOpacity={1}
          onPressOut={() => !isSubmitting && setReportModalVisible(false)} // Close on press outside
        >
          {/* Use View for content */}
          <View style={styles.modalContainer2}>
            <Text style={styles.modalTitle2}>Report Item Abuse</Text>
            {abuseReasons.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonButton,
                  selectedReason === reason && styles.reasonButtonSelected,
                ]}
                onPress={() => setSelectedReason(reason)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.reasonButtonText,
                    selectedReason === reason && styles.reasonButtonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.reportInput}
              placeholder={
                selectedReason === 'Other'
                  ? 'Please describe the issue*'
                  : 'Additional details (optional)'
              }
              multiline
              numberOfLines={3}
              value={reportDescription}
              onChangeText={setReportDescription}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || !selectedReason) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitReport}
              disabled={isSubmitting || !selectedReason}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}> Submit Report </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => !isSubmitting && setReportModalVisible(false)}
              disabled={isSubmitting}
              style={{ marginTop: 10 }}
            >
              <Text style={[styles.cancelText, isSubmitting && styles.disabledText]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- Global Loading Indicator (Overlay for background tasks) --- */}
      {isLoading && (item || isEditing) && ( // Show overlay during background loads AFTER initial item load or during edits
         <View style={styles.loadingOverlay}>
             <ActivityIndicator size="large" color="#ffffff" />
             <Text style={styles.loadingOverlayText}>Processing...</Text>
         </View>
      )}
    </View>
  );
}

// --- Styles --- (Includes fixes and formatting)
const styles = StyleSheet.create({
  // Core
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Light gray background
    paddingTop: 40, // Status bar handling
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Loading & Error States
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b', // Slate-500
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444', // Red-500
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonFallback: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: '#e2e8f0', // Slate-200
    borderRadius: 8,
  },
  backButtonFallbackText: {
    fontSize: 16,
    color: '#334155', // Slate-700
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Cover screen
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // On top
  },
  loadingOverlayText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 15,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // Slate-200
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? 15 : 40, // Status bar handling
  },
  backButton: {
    padding: 5, // Hit area
    width: 40, // Alignment width
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a', // Slate-900
    textAlign: 'center',
    flex: 1, // Take available space
    marginHorizontal: 10, // Space around title
  },
  editButton: {
    padding: 5, // Hit area
    width: 40, // Alignment width
    alignItems: 'flex-end',
  },
  headerPlaceholder: {
    width: 40, // Match button area width
  },
  // Image
  imageContainer: {
    position: 'relative', // For overlay
    width: '100%',
    aspectRatio: 16 / 9, // Maintain aspect ratio
    backgroundColor: '#e2e8f0', // Placeholder background
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholderContainer: {
    backgroundColor: '#f1f5f9', // Lighter gray
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    aspectRatio: 16 / 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  placeholderText: {
    marginTop: 8,
    color: '#94a3b8', // Slate-400
    fontSize: 14,
  },
  imageActionsOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    left: 10,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingVertical: 8,
  },
  imageActionButton: {
    flexDirection: 'row', // Redundant if using iconTextContainer but safe
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteImageButton: {
    // Can add specific styles like background color if needed
  },
  imageActionText: {
    color: '#ffffff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  addImageButton: {    
    backgroundColor: '#e0f7fe', // Lighter gray
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    aspectRatio: 16 / 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a5f3fc', // Cyan border
    borderStyle: 'dashed',
  },
  addImageText: {borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a5f3fc', // Cyan border
    borderStyle: 'dashed',
    marginTop: 8,
    color: '#0e7490', // Darker cyan text
    fontSize: 16,
  },
  // Details Section
  details: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align badges/buttons top
    marginBottom: 16,
    minHeight: 30, // Ensure it has height
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1, // Allow shrinking if actions take space
    marginRight: 10, // Space between badges and actions
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 10, // Slightly more padding
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden', // Clip text if needed
    marginRight: 8,
    marginBottom: 4, // Space for wrapping
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lostBadge: {
    backgroundColor: '#fee2e2', // Red-100
    color: '#b91c1c', // Red-700
  },
  foundBadge: {
    backgroundColor: '#dcfce7', // Green-100
    color: '#166534', // Green-800
  },
  resolvedBadge: {
    backgroundColor: '#e5e7eb', // Gray-200
    color: '#4b5563', // Gray-600
  },
  headerActionButton: {
    // Structure defined by iconTextContainer now
    paddingVertical: 4,
    paddingHorizontal: 8, // Keep padding for touch area
  },
  headerActionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  textContainer: {
    marginTop: 10, // Space below badges/actions if they were shown
  },
  description: {
    fontSize: 16,
    lineHeight: 24, // Improve readability
    color: '#334155', // Slate-700
    marginBottom: 15,
  },
  meta: {
    fontSize: 12,
    color: '#64748b', // Slate-500
    marginTop: 10,
  },
  // Edit Mode
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569', // Slate-600
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: '#ffffff', // White background for inputs
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderColor: '#cbd5e1', // Slate-300 border
    borderWidth: 1,
    color: '#1e293b', // Slate-800 text
  },
  editTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  switchLabel: {
    fontSize: 16,
    color: '#64748b', // Slate-500 (inactive)
    fontWeight: '500',
    flex: 1, // Take up space
    textAlign: 'center',
  },
  switchLabelActive: {
    color: '#0f172a', // Slate-900 (active)
    fontWeight: '600',
  },
  cancelEditButton: {
    backgroundColor: '#f00755', // Slate-200
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5, // Reduced margin
    borderWidth: 1,
    borderColor: '#cbd5e1', // Slate-300
  },
  cancelEditButtonText: {
    color: '#e8e6e7', // Slate-600
    fontSize: 16,
    fontWeight: '500',
  },
  // Contacts & Contact Options
  contactsSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155', // Slate-700
    marginBottom: 12,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // Slate-200
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9', // Slate-100
  },
  contactInfo: {
    flex: 1, // Allow email to shrink
    marginRight: 10,
  },
  contactEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b', // Slate-800
  },
  contactMethod: {
    fontSize: 12,
    color: '#64748b', // Slate-500
    marginTop: 2,
  },
  contactTime: {
    fontSize: 11,
    color: '#94a3b8', // Slate-400
    textAlign: 'right',
  },
  noContacts: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 15,
    paddingVertical: 10,
  },
  contactOptions: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    marginTop: 10,
  },
  contactButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0', // Slate-200
    // Shadow removed for cleaner look, use elevation if needed
    elevation: 1,
    flexDirection: 'row', // Added back for safety, though iconTextContainer handles it
    alignItems: 'center', // Added back for safety
  },
  contactButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a', // Slate-900
    flexShrink: 1, // Allow text to shrink if needed
  },
  // Utility: Icon + Text Wrapper
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center within the touchable area
    flexGrow: 1, // Ensure it fills touchable if needed
  },
  iconTextContainer_vertical: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Position modal at bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay2: { // For center modal
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
  },
  modalContent: { // Bottom sheet style
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Safe area padding
  },
  modalContainer2: { // Centered card style
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch', // Stretch children horizontally
  },
  modalTitle: { // Title for bottom sheet
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    color: '#1e293b',
  },
  modalTitle2: { // Title for centered modal
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#1e293b',
  },
  modalOption: { // Row option in bottom sheet
    flexDirection: 'row', // Handled by iconTextContainer now, but keep for padding
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  modalIcon: {
    // marginRight handled by modalOptionText marginLeft now
  },
  modalOptionText: {
    fontSize: 16,
    color: '#334155', // Slate-700
    marginLeft: 15, // Space between icon and text
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#e2e8f0', // Slate-200
    marginVertical: 8,
    marginHorizontal: 20,
  },
  modalCancelButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 5,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#0891b2', // Cyan-600
    fontWeight: '600',
  },
  // Report Modal Specific
  reasonButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1', // Slate-300
    marginBottom: 8,
    alignItems: 'center',
  },
  reasonButtonSelected: {
    backgroundColor: '#e0f7fe', // Cyan-100
    borderColor: '#0891b2', // Cyan-600
  },
  reasonButtonText: {
    fontSize: 14,
    color: '#334155', // Slate-700
  },
  reasonButtonTextSelected: {
    fontWeight: '600',
    color: '#0e7490', // Cyan-700
  },
  reportInput: {
    backgroundColor: '#f8fafc', // Slate-50
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderColor: '#cbd5e1', // Slate-300
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0891b2', // Cyan-600
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48, // Ensure space for indicator
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a5f3fc', // Lighter cyan
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: { // Report Modal Cancel
    marginTop: 15,
    textAlign: 'center',
    color: '#64748b', // Slate-500
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    color: '#cbd5e1', // Slate-300
  },
});