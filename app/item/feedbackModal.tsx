import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    helperName: string;
    rating: number;
    experience: string;
  }) => void;
  type: 'lost' | 'found';
  itemId: string;
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

  const handleSubmit = async () => {
    if (!itemId) {
      console.error('Error: itemId is missing');
      return;
    }
  
    const feedbackData = {
      item_id: itemId,
      helper_name: helperName,
      rating,
      experience,
      created_at: new Date().toISOString(),
    };
  
    try {
      const { data, error } = await supabase.from('feedback').insert([feedbackData]);
  
      if (error) {
        throw error;
      }
  
      console.log('Feedback saved:', data);
  
      // Transform data to match the expected structure before calling onSubmit
      onSubmit({
        helperName,  // Match expected format
        rating,
        experience,
      });
  
      // Reset form
      setHelperName('');
      setRating(0);
      setExperience('');
      onClose();
      Alert.alert('Success', 'Successfully submitted feedback');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Problem with the server, please try again!');
    }
  };
  

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>
            {type === 'lost' ? 'Who helped you find it?' : 'Share your experience'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={type === 'lost' ? "Helper's name" : "Owner's name"}
            value={helperName}
            onChangeText={setHelperName}
          />

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Rate your experience:</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Star
                    size={32}
                    color={star <= rating ? '#fbbf24' : '#e2e8f0'}
                    fill={star <= rating ? '#fbbf24' : 'none'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Share your experience..."
            value={experience}
            onChangeText={setExperience}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!helperName || !rating) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!helperName || !rating}
          >
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 10,
    zIndex: 2,
    padding: 8,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
