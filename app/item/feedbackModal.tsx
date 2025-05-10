import React, { useState, useEffect } from 'react'; // Added useEffect
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator, // Added for loading state
  Keyboard, // Added to dismiss keyboard
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase'; // Ensure path is correct

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    // Callback confirms submission success
    helperName: string;
    rating: number;
    experience: string;
  }) => void; // Changed: No need to pass full feedbackData, just confirm
  type: 'lost' | 'found';
  itemId: string | null; // Allow null initially
}

export default function FeedbackModal({
  isVisible,
  onClose,
  onSubmit,
  type,
  itemId,
}: FeedbackModalProps) {
  const [helperName, setHelperName] = useState('');
  const [rating, setRating] = useState(0);
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

  // Reset form state when the modal becomes visible or itemId changes
  useEffect(() => {
    if (isVisible) {
      setHelperName('');
      setRating(0);
      setExperience('');
      setIsSubmitting(false); // Reset submitting state
    }
  }, [isVisible, itemId]); // Depend on visibility and itemId

  const handleSubmit = async () => {
    // Basic validation
    if (!helperName.trim()) {
      Alert.alert(
        'Input Required',
        `Please enter the ${type === 'lost' ? "helper's" : "owner's"} name.`,
      );
      return;
    }
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    if (!itemId) {
      console.error('Error: itemId is missing in FeedbackModal');
      Alert.alert(
        'Error',
        'Cannot submit feedback. Item information is missing.',
      );
      return;
    }

    Keyboard.dismiss(); // Dismiss keyboard before submitting
    setIsSubmitting(true);

    const feedbackData = {
      item_id: itemId, // Use the passed itemId
      helper_name: helperName.trim(),
      rating,
      experience: experience.trim(), // Trim whitespace
      // Supabase automatically adds created_at if column default is now()
      // created_at: new Date().toISOString(), // Or set manually if needed
    };

    try {
      // Check if feedback for this item already exists (optional but good practice)
      const { data: existingFeedback, error: checkError } = await supabase
        .from('feedback')
        .select('id')
        .eq('item_id', itemId)
        .limit(1); // Just need to know if any exists

      if (checkError) {
        console.warn(
          'Could not check for existing feedback:',
          checkError.message,
        );
        // Decide if you want to proceed anyway or throw error
      }

      if (existingFeedback && existingFeedback.length > 0) {
        Alert.alert(
          'Already Submitted',
          'Feedback for this item has already been submitted.',
        );
        setIsSubmitting(false);
        onClose(); // Close the modal
        return; // Stop submission
      }

      // Insert new feedback
      const { error: insertError } = await supabase
        .from('feedback')
        .insert(feedbackData); // Insert the prepared data

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        // Provide more specific error message if possible
        throw new Error(
          insertError.message || 'Failed to save feedback to the database.',
        );
      }

      console.log('Feedback saved successfully for item:', itemId);

      // Call the onSubmit prop to notify the parent component (ProfileScreen)
      // that submission was successful. ProfileScreen will then handle marking
      // the item as resolved.
      onSubmit({
        helperName: feedbackData.helper_name, // Pass submitted data back if needed
        rating: feedbackData.rating,
        experience: feedbackData.experience,
      });

      Alert.alert('Success', 'Feedback submitted successfully!');
      // No need to reset state here, useEffect handles it on next open
      // No need to call onClose here, onSubmit should trigger ProfileScreen to close it if needed
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Submission Error',
        error.message || 'Could not submit feedback. Please try again.',
      );
    } finally {
      setIsSubmitting(false); // Always turn off loading indicator
    }
  };

  // Render nothing if not visible or no item ID
  if (!isVisible || !itemId) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }} // Prevent closing while submitting
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPressOut={() => {
          if (!isSubmitting) onClose();
        }} // Close on tap outside if not submitting
      >
        {/* Prevent taps inside content from closing */}
        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (!isSubmitting) onClose();
            }}
            disabled={isSubmitting}
          >
            <X size={24} color={isSubmitting ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Item Resolved!</Text>
          <Text style={styles.modalSubtitle}>
            {type === 'lost'
              ? 'Great news! Who helped you find it?'
              : 'Glad it was reclaimed! Share your experience.'}
          </Text>

          <TextInput
            style={[styles.input, isSubmitting && styles.disabledInput]}
            placeholder={
              type === 'lost'
                ? "Helper's Name / Description"
                : "Reclaimer's Name / Description"
            }
            placeholderTextColor="#94a3b8"
            value={helperName}
            onChangeText={setHelperName}
            editable={!isSubmitting}
            autoCapitalize="words"
          />

          <View style={styles.ratingContainer}>
            <Text
              style={[styles.ratingLabel, isSubmitting && styles.disabledText]}
            >
              Rate the Interaction:
            </Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => !isSubmitting && setRating(star)} // Prevent change while submitting
                  style={styles.starButton}
                  disabled={isSubmitting}
                >
                  <Star
                    size={32}
                    color={
                      isSubmitting
                        ? '#e2e8f0'
                        : star <= rating
                          ? '#fbbf24'
                          : '#cbd5e1'
                    }
                    fill={
                      isSubmitting
                        ? 'none'
                        : star <= rating
                          ? '#fbbf24'
                          : 'none'
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
              isSubmitting && styles.disabledInput,
            ]}
            placeholder="Share details about the experience (optional)"
            placeholderTextColor="#94a3b8"
            value={experience}
            onChangeText={setExperience}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              // Disable if submitting OR required fields are missing
              (isSubmitting || !helperName.trim() || rating === 0) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !helperName.trim() || rating === 0}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// --- Styles --- (Use styles consistent with ProfileScreen or define specific ones)
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20, // Add padding to prevent touching edges
  },
  modalContent: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 25,
    paddingTop: 45, // More space for close button
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
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
  disabledInput: {
    backgroundColor: '#f1f5f9', // Slightly different background when disabled
    color: '#94a3b8',
  },
  textArea: {
    minHeight: 80, // Adjust height
    textAlignVertical: 'top',
  },
  ratingContainer: {
    marginBottom: 20,
    alignItems: 'center', // Center rating elements
  },
  ratingLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
    fontWeight: '500',
  },
  disabledText: {
    color: '#cbd5e1', // Muted text color when disabled
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Center stars horizontally
  },
  starButton: {
    paddingHorizontal: 5, // Space out stars
  },
  submitButton: {
    backgroundColor: '#0891b2', // Match theme
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#a5f3fc',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
