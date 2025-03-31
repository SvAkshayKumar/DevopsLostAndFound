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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Phone, Mail, MessageSquare, MessageCircle } from 'lucide-react-native';

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
  contacted_by: string;
  contacted_by_email: string;
  method: string;
  created_at: string;
};

type Profile = {
  phone_number: string | null;
};

export default function ItemScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
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
    fetchContacts();

    // Subscribe to contacts changes
    const subscription = supabase
      .channel('contact_attempts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_attempts',
        filter: `item_id=eq.${id}`,
      }, () => {
        fetchContacts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const fetchItem = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: itemData, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching item:', error);
      return;
    }

    setItem(itemData);
    setIsOwner(user?.id === itemData.user_id);

    if (itemData) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', itemData.user_id)
        .single();
      
      setOwnerProfile(profileData);
    }
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contact_attempts')
      .select(`
        *,
        contacted_by_user:contacted_by(email)
      `)
      .eq('item_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      return;
    }

    setContacts(data || []);
  };

  const handleContact = async (method: string) => {
    if (!currentUser || !item) return;

    try {
      const { error } = await supabase.from('contact_attempts').insert({
        contacted_by: currentUser,
        posted_user_id: item.user_id,
        item_id: id,
        method,
      });

      if (error) throw error;

      switch (method) { 
        case 'phone':
          if (ownerProfile?.phone_number) {
            Linking.openURL(`tel:${ownerProfile.phone_number}`);
          }
          break;
        case 'email':
          Linking.openURL(`mailto:${item.user_email}`);
          break;
        case 'sms':
          if (ownerProfile?.phone_number) {
            Linking.openURL(`sms:${ownerProfile.phone_number}?body=Hello, I am contacting you regarding...`);
          }
          break;
        case 'whatsapp':
          if (ownerProfile?.phone_number) {
            Linking.openURL(`https://wa.me/${ownerProfile.phone_number}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      Alert.alert('Error', 'Failed to record contact');
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
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>

        {isOwner ? (
          <View style={styles.contactsList}>
            <Text style={styles.contactsTitle}>Reach Out Attempts</Text>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactItem}>
                <Text style={styles.contactEmail}>
                  {contact.contacted_by_user.email}
                </Text>
                <Text style={styles.contactMethod}>
                  via {contact.method}
                </Text>
                <Text style={styles.contactTime}>
                  {new Date(contact.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
            {contacts.length === 0 && (
              <Text style={styles.noContacts}>No contact requests yet</Text>
            )}
          </View>
        ) : (
          <View style={styles.contactOptions}>
            <Text style={styles.contactTitle}>Contact Options</Text>
            {ownerProfile?.phone_number && (
              <>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact('phone')}
                >
                  <Phone size={24} color="#0891b2" />
                  <Text style={styles.contactButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact('whatsapp')}
                >
                  <MessageCircle size={24} color="#0891b2" />
                  <Text style={styles.contactButtonText}>Send Whatsapp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact('sms')}
                >
                  <MessageSquare size={24} color="#0891b2" />
                  <Text style={styles.contactButtonText}>Send SMS</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContact('email')}
            >
              <Mail size={24} color="#0891b2" />
              <Text style={styles.contactButtonText}>Send Email</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  body : {
    paddingTop : 50
  },
  container: {
    flex: 1,
    // backgroundColor: 'white',
    // paddingTop: 24, // Prevent content from touching the top
    // marginTop : 0
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    // marginTop: ,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  details: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  type: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
    lineHeight: 24,
  },
  meta: {
    fontSize: 14,
    color: '#64748b',
  },
  contactsList: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  contactsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    marginTop: 8,
  },
  contactItem: {
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  contactMethod: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  contactTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noContacts: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    padding: 32,
  },
  contactOptions: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    marginBottom: 12,
  },
  contactButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#0284c7',
    fontWeight: '600',
  },
});
