import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

type ContactPreview = {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  last_contact_time: string;
};

export default function ChatsScreen() {
  const [contacts, setContacts] = useState<ContactPreview[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const setupContacts = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setError('Failed to get authenticated user: ' + authError.message);
        return;
      }
      
      if (user) {
        setCurrentUser(user.id);
        await fetchContacts(user.id);

        // Subscribe to both incoming and outgoing contact attempts
        subscriptionRef.current = supabase
          .channel('contact_attempts')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'contact_attempts',
            filter: `or(posted_user_id.eq.${user.id},contacted_by.eq.${user.id})`,
          }, () => {
            fetchContacts(user.id);
          })
          .subscribe((status: string) => {
            console.log('Subscription status:', status);
          });
      }
    };

    setupContacts();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  const fetchContacts = async (userId: string) => {
    try {
      console.log('Fetching contacts for user:', userId);

      // Fetch contact attempts where user is either the poster or the contactor
      const { data: contactAttempts, error: contactError } = await supabase
        .from('contact_attempts')
        .select('id, contacted_by, posted_user_id, created_at')
        .or(`posted_user_id.eq.${userId},contacted_by.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (contactError) throw new Error('Contact attempts error: ' + contactError.message);
      if (!contactAttempts?.length) {
        console.log('No contact attempts found');
        setContacts([]);
        return;
      }

      console.log('Contact attempts found:', contactAttempts.length);

      // Get unique user IDs (excluding current user)
      const uniqueUserIds = [...new Set(contactAttempts.flatMap(attempt => [
        attempt.contacted_by,
        attempt.posted_user_id
      ].filter(id => id !== userId)))];
      
      console.log('Unique user IDs:', uniqueUserIds);

      // Fetch profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .in('id', uniqueUserIds);

      if (profileError) throw new Error('Profiles error: ' + profileError.message);
      if (!profiles?.length) {
        console.log('No profiles found for users');
        setContacts([]);
        return;
      }

      console.log('Profiles found:', profiles);

      // Map contacts with latest contact time from either direction
      const contactMap = new Map<string, ContactPreview>();
      profiles.forEach(profile => {
        const relevantAttempts = contactAttempts.filter(attempt => 
          (attempt.contacted_by === profile.id && attempt.posted_user_id === userId) ||
          (attempt.contacted_by === userId && attempt.posted_user_id === profile.id)
        );
        
        const lastContactTime = relevantAttempts.length > 0
          ? relevantAttempts.reduce((latest, current) => 
              new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            ).created_at
          : profile.created_at;

        contactMap.set(profile.id, {
          user_id: profile.id,
          full_name: profile.full_name || 'Anonymous User',
          email: profile.email || 'No email',
          avatar_url: profile.avatar_url,
          last_contact_time: lastContactTime,
        });
      });

      const sortedContacts = Array.from(contactMap.values()).sort(
        (a, b) => new Date(b.last_contact_time).getTime() - new Date(a.last_contact_time).getTime()
      );
      setContacts(sortedContacts);
      console.log('Final contacts:', sortedContacts);
    } catch (err: any) {
      console.error('Fetch contacts error:', err);
      setError(err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUser) {
      await fetchContacts(currentUser);
    }
    setRefreshing(false);
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const contactDate = new Date(dateString);
    const diffDays = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return contactDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return contactDate.toLocaleDateString('en-US', { weekday: 'long' });
    return contactDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: ContactPreview }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/${item.user_id}`)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.defaultAvatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.fullName}>{item.full_name}</Text>
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
        <Text style={styles.timestamp}>{formatTime(item.last_contact_time)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#666"
            colors={['#666']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {error ? 'Login to view Connections' : 'No connections yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 10,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  fullName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#fee2e2',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
});