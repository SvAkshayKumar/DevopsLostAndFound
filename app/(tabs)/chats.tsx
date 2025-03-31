import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function ChatsScreen() {
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();
  const subscriptionRef = useRef(null);

  useEffect(() => {
    const setupContacts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        await fetchContacts(user.id);
      }
    };

    setupContacts();
  }, []);

  const fetchContacts = async (userId) => {
    try {
      // Fetch unique user IDs from messages table
      const { data: messageContacts, error: messageError } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (messageError) throw messageError;

      // Extract unique user IDs
      const uniqueUserIds = new Set();
      messageContacts.forEach(({ sender_id, receiver_id }) => {
        if (sender_id !== userId) uniqueUserIds.add(sender_id);
        if (receiver_id !== userId) uniqueUserIds.add(receiver_id);
      });

      // Fetch unique user IDs from contact_attempts table
      const { data: contactAttempts, error: contactError } = await supabase
        .from('contact_attempts')
        .select('created_by')
        .eq('posted_user_id', userId);

      if (contactError) throw contactError;

      contactAttempts.forEach(({ created_by }) => {
        if (created_by !== userId) uniqueUserIds.add(created_by);
      });

      // Fetch user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', Array.from(uniqueUserIds));

      if (profileError) throw profileError;

      setContacts(profiles);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <Image 
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/60' }} 
        style={styles.avatar} 
      />
      <View style={styles.contactInfo}>
        <Text style={styles.fullName}>{item.full_name || 'Unknown User'}</Text>
        <Text style={styles.email}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyStateText}>No contacts found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  otherUser: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  type: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  unreadBadge: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});