import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Phone, Mail, MessageCircle } from 'lucide-react-native';

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
  user_phone?: string;
  user_whatsapp?: string;
};

type ContactAttempt = {
  id: string;
  contacted_by: string;
  method: 'phone' | 'whatsapp' | 'email';
  created_at: string;
  user_email: string;
  user_name: string;
  user_avatar?: string;
};

export default function ItemScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [contactAttempts, setContactAttempts] = useState<ContactAttempt[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchItem();
  }, [id]);

  useEffect(() => {
    if (item) {
      checkOwnership();
    }
  }, [item]);

  useEffect(() => {
    if (isOwner) {
      fetchContactAttempts();
    }
  }, [isOwner]);

  const fetchItem = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*, profiles(phone, whatsapp)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching item:', error);
      return;
    }

    setItem({
      ...data,
      user_phone: data.profiles?.phone,
      user_whatsapp: data.profiles?.whatsapp,
    });
  };

  const checkOwnership = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && item) {
      setIsOwner(user.id === item.user_id);
    }
  };

  const fetchContactAttempts = async () => {
    if (!id) return;
  
    const { data, error } = await supabase
      .from('contact_attempts')
      .select(`
        id, contacted_by, method, created_at,
        profiles:contacted_by (email, full_name, avatar_url)
      `)
      .eq('item_id', id)
      .order('created_at', { ascending: false });
  
    if (error) {
      console.error('Error fetching contact attempts:', error);
      return;
    }
  
    setContactAttempts(
      data.map(attempt => ({
        ...attempt,
        user_email: attempt.profiles?.email,
        user_name: attempt.profiles?.full_name,
        user_avatar: attempt.profiles?.avatar_url,
      }))
    );
  };
  

  const recordContactAttempt = async (method: 'phone' | 'whatsapp' | 'email') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Please sign in to contact the user');
      return;
    }

    const { error } = await supabase.from('contact_attempts').insert({
      contacted_by: user.id,
      posted_user_id: item?.user_id,
      item_id: id,
      method,
    });

    if (error) {
      console.error('Error recording contact attempt:', error);
    }
  };

  const handleContact = async (method: 'phone' | 'whatsapp' | 'email') => {
    if (!item) return;

    await recordContactAttempt(method);

    switch (method) {
      case 'phone':
        Linking.openURL(`tel:${item.user_phone}`);
        break;
      case 'whatsapp':
        Linking.openURL(`https://wa.me/${item.user_whatsapp}`);
        break;
      case 'email':
        Linking.openURL(`mailto:${item.user_email}`);
        break;
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

      <View style={styles.content}>
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

          {!isOwner && (
            <View style={styles.contactOptions}>
              <Text style={styles.contactTitle}>Contact Options</Text>
              
              {item.user_phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact('phone')}
                >
                  <Phone size={24} color="#ffffff" />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
              )}

              {item.user_whatsapp && (
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                  onPress={() => handleContact('whatsapp')}
                >
                  <MessageCircle size={24} color="#ffffff" />
                  <Text style={styles.contactButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: '#EA4335' }]}
                onPress={() => handleContact('email')}
              >
                <Mail size={24} color="#ffffff" />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            </View>
          )}

          {isOwner && contactAttempts.length > 0 && (
            <View style={styles.contactAttempts}>
              <Text style={styles.contactAttemptsTitle}>Contact Attempts</Text>
              {contactAttempts.map((attempt) => (
                <View key={attempt.id} style={styles.contactAttempt}>
                  <View style={styles.contactAttemptUser}>
                    {attempt.user_avatar && (
                      <Image
                        source={{ uri: attempt.user_avatar }}
                        style={styles.avatar}
                      />
                    )}
                    <View>
                      <Text style={styles.contactAttemptName}>
                        {attempt.user_name || attempt.user_email}
                      </Text>
                      <Text style={styles.contactAttemptMeta}>
                        via {attempt.method} • {new Date(attempt.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
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
  contactOptions: {
    marginTop: 24,
    gap: 12,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactAttempts: {
    marginTop: 24,
  },
  contactAttemptsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  contactAttempt: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactAttemptUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactAttemptName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  contactAttemptMeta: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
});