import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Camera, Send, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

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

type Message = {
  id: string;
  content: string;
  sender_email: string;
  sender_id: string;
  created_at: string;
  image_url: string | null;
};

type GroupedMessages = {
  [date: string]: Message[];
};

export default function ItemScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<GroupedMessages>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
      }
    };
    getCurrentUser();
    fetchItem();
    fetchMessages();

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `item_id=eq.${id}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const fetchItem = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching item:', error);
      return;
    }

    setItem(data);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
    groupMessagesByDate(data || []);
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped = messages.reduce((acc: GroupedMessages, message) => {
      const date = new Date(message.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(message);
      return acc;
    }, {});

    setGroupedMessages(grouped);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      await sendMessage('', result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filename = `${user.id}/${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(filename, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const sendMessage = async (content: string = '', imageUri?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Please sign in to send messages');
      return;
    }

    if (!content.trim() && !imageUri) {
      Alert.alert('Error', 'Please provide a message or image');
      return;
    }

    setLoading(true);

    try {
      let imageUrl;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      const { error } = await supabase.from('messages').insert({
        item_id: id,
        sender_id: user.id,
        sender_email: user.email,
        content: content.trim(),
        image_url: imageUrl,
      });

      if (error) throw error;
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0891b2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{item.title}</Text>
      </View>

      <ScrollView style={styles.content}>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        )}

        <View style={styles.details}>
          <Text
            style={[
              styles.type,
              { backgroundColor: item.type === 'lost' ? '#fee2e2' : '#dcfce7' },
            ]}
          >
            {item.type.toUpperCase()}
          </Text>

          <Text style={styles.description}>{item.description}</Text>

          <Text style={styles.meta}>
            Posted by {item.user_email}
            {'\n'}
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.chatSection}>
          <Text style={styles.chatTitle}>Messages</Text>
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <View key={date}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>{date}</Text>
              </View>
              {dateMessages.map((message) => (
                <View 
                  key={message.id} 
                  style={[
                    styles.message,
                    message.sender_id === currentUser ? styles.sentMessage : styles.receivedMessage
                  ]}
                >
                  {message.sender_id !== currentUser && (
                    <Text style={styles.messageSender}>{message.sender_email}</Text>
                  )}
                  {message.image_url && (
                    <Image
                      source={{ uri: message.image_url }}
                      style={styles.messageImage}
                    />
                  )}
                  {message.content && (
                    <Text style={[
                      styles.messageContent,
                      message.sender_id === currentUser ? styles.sentMessageText : styles.receivedMessageText
                    ]}>
                      {message.content}
                    </Text>
                  )}
                  <Text style={styles.messageTime}>
                    {formatTime(message.created_at)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.imageButton}>
          <Camera size={24} color="#0891b2" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={() => sendMessage(newMessage)}
          disabled={loading}
        >
          <Send size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        paddingTop: 60,
      },
      android: {
        paddingTop: 40,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  details: {
    padding: 16,
  },
  type: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 12,
    lineHeight: 24,
  },
  meta: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  chatSection: {
    padding: 16,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  message: {
    maxWidth: '80%',
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0891b2',
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageContent: {
    fontSize: 16,
    marginBottom: 4,
  },
  sentMessageText: {
    color: '#1e293b',
  },
  receivedMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 10,
    color: '#94a3b8',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  imageButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0891b2',
    borderRadius: 20,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});