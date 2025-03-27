import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

type ChatPreview = {
  item_id: string;
  item_title: string;
  item_type: 'lost' | 'found';
  other_user_id: string;
  other_user_email: string;
  last_message: string;
  last_message_time: string;
  image_url?: string;
  unread_count: number;
};

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const router = useRouter();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const setupChats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        await fetchChats(user.id);

        // Subscribe to new messages
        subscriptionRef.current = supabase
          .channel('messages')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id},sender_id=eq.${user.id}`,
          }, () => {
            fetchChats(user.id);
          })
          .subscribe();
      }
    };

    setupChats();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const fetchChats = async (userId: string) => {
    try {
      // Get all messages where user is either sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          item_id,
          sender_id,
          sender_email,
          receiver_id,
          receiver_email,
          content,
          created_at,
          items (
            id,
            title,
            type,
            image_url,
            user_id
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation (item_id + other_user)
      const chatMap = new Map<string, ChatPreview>();

      messages?.forEach(message => {
        const isReceiver = message.receiver_id === userId;
        const otherUserId = isReceiver ? message.sender_id : message.receiver_id;
        const otherUserEmail = isReceiver ? message.sender_email : message.receiver_email;
        const chatKey = `${message.item_id}-${otherUserId}`;

        if (!chatMap.has(chatKey)) {
          chatMap.set(chatKey, {
            item_id: message.item_id,
            item_title: message.items.title,
            item_type: message.items.type,
            other_user_id: otherUserId,
            other_user_email: otherUserEmail,
            last_message: message.content || '(Image)',
            last_message_time: message.created_at,
            image_url: message.items.image_url,
            unread_count: 0
          });
        }
      });

      setChats(Array.from(chatMap.values()).sort(
        (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      ));
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageDate.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const renderItem = ({ item }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/${item.item_id}?userId=${item.other_user_id}`)}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
      )}
      <View style={styles.chatInfo}>
        <Text style={styles.itemTitle}>{item.item_title}</Text>
        <Text style={styles.otherUser}>with {item.other_user_email}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message}
        </Text>
        <Text style={styles.timestamp}>
          {formatTime(item.last_message_time)}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <Text
          style={[
            styles.type,
            { backgroundColor: item.item_type === 'lost' ? '#fee2e2' : '#dcfce7' },
          ]}
        >
          {item.item_type.toUpperCase()}
        </Text>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.item_id}-${item.other_user_id}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No active chats</Text>
          </View>
        }
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