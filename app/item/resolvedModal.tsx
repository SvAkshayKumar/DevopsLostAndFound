import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Star, Mail } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type ResolvedItemDetailsModalProps = {
  isVisible: boolean;
  onClose: () => void;
  itemId: string;
};

type FeedbackDetails = {
  id: string;
  item_id: string;
  helper_name: string;
  rating: number;
  experience: string;
  created_at: string;
};

export default function ResolvedItemDetailsModal({
  isVisible,
  onClose,
  itemId,
}: ResolvedItemDetailsModalProps) {
  const [feedbackDetails, setFeedbackDetails] =
    useState<FeedbackDetails | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isVisible && itemId) {
      fetchFeedbackDetails();
    }
  }, [isVisible, itemId]);

  const fetchFeedbackDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (data.length > 0) {
        setFeedbackDetails(data[0]);
      } else {
        setFeedbackDetails(null);
      }
    } catch (error) {
      console.error('Error fetching feedback details:', error);
      Alert.alert('Error', 'Failed to load feedback details');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        size={20}
        color={index < rating ? '#fbbf24' : '#e2e8f0'}
        fill={index < rating ? '#fbbf24' : 'none'}
      />
    ));
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#1e293b" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Resolution Details</Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading feedback details...</Text>
          ) : feedbackDetails ? (
            <ScrollView style={styles.feedbackContainer}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resolved By</Text>
                <Text style={styles.helperName}>{feedbackDetails.helper_name}</Text>
                <Text style={styles.dateText}>
                  {new Date(feedbackDetails.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rating</Text>
                <View style={styles.ratingContainer}>
                  {renderStars(feedbackDetails.rating)}
                  <Text style={styles.ratingText}>{feedbackDetails.rating}/5</Text>
                </View>
              </View>

              {feedbackDetails.experience && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Experience</Text>
                  <View style={styles.experienceContainer}>
                    <Text style={styles.experienceText}>
                      {showFullDescription
                        ? feedbackDetails.experience
                        : `${feedbackDetails.experience.slice(0, 100)}${
                            feedbackDetails.experience.length > 100 ? '...' : ''
                          }`}
                    </Text>
                    {feedbackDetails.experience.length > 100 && (
                      <TouchableOpacity
                        onPress={() =>
                          setShowFullDescription(!showFullDescription)
                        }
                      >
                        <Text style={styles.readMoreText}>
                          {showFullDescription ? 'Show less' : 'Read more'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <Text style={styles.noDataText}>No feedback details available</Text>
          )}
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
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },
  feedbackContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  helperName: {
    fontSize: 18,
    color: '#1e293b',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    marginLeft: 4,
  },
  experienceContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
  },
  experienceText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
  },
  readMoreText: {
    color: '#0891b2',
    fontWeight: '500',
    marginTop: 8,
  },
  emailButton: {
    backgroundColor: '#0891b2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  emailIcon: {
    marginRight: 8,
  },
  emailButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
  },
});
