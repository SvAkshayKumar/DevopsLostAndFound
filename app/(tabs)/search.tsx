import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, Filter } from 'lucide-react-native';

type Item = {
  id: string;
  title: string;
  description: string;
  type: 'lost' | 'found';
  image_url: string;
  created_at: string;
  user_id: string;
  user_email: string;
};

type FilterOptions = {
  type: 'all' | 'lost' | 'found';
  onlyMine: boolean;
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    onlyMine: false,
  });
  const router = useRouter();

  useEffect(() => {
    searchItems();
  }, [filters]);

  const searchItems = async () => {
    if (!searchQuery.trim() && filters.type === 'all' && !filters.onlyMine) {
      setItems([]);
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('items')
      .select('*')
      .eq('status', 'active');

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    if (filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters.onlyMine && user) {
      query = query.eq('user_id', user.id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error searching items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text
            style={[
              styles.itemType,
              { backgroundColor: item.type === 'lost' ? '#fee2e2' : '#dcfce7' },
            ]}
          >
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.itemMeta}>
          Posted by {item.user_email} • {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <SearchIcon size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for lost or found items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[
              styles.filterButton,
              (filters.type !== 'all' || filters.onlyMine) && styles.filterActive,
            ]}
          >
            <Filter size={20} color={
              (filters.type !== 'all' || filters.onlyMine) ? '#0891b2' : '#64748b'
            } />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterContainer}>
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Type</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.type === 'all' && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, type: 'all' })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.type === 'all' && styles.filterOptionTextActive,
                  ]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.type === 'lost' && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, type: 'lost' })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.type === 'lost' && styles.filterOptionTextActive,
                  ]}>Lost</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.type === 'found' && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, type: 'found' })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.type === 'found' && styles.filterOptionTextActive,
                  ]}>Found</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <TouchableOpacity
                style={[
                  styles.myItemsFilter,
                  filters.onlyMine && styles.myItemsFilterActive,
                ]}
                onPress={() => setFilters({ ...filters, onlyMine: !filters.onlyMine })}
              >
                <Text style={[
                  styles.myItemsFilterText,
                  filters.onlyMine && styles.myItemsFilterTextActive,
                ]}>Show Only My Items</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery || filters.type !== 'all' || filters.onlyMine
                ? 'No items found matching your search'
                : 'Start typing to search for items'}
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
    backgroundColor: '#f8fafc',
  },
  header: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1e293b',
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
  },
  filterActive: {
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  filterContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  filterOptionActive: {
    backgroundColor: '#0891b2',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  myItemsFilter: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  myItemsFilterActive: {
    backgroundColor: '#0891b2',
  },
  myItemsFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  myItemsFilterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  itemContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  itemType: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  itemMeta: {
    fontSize: 12,
    color: '#94a3b8',
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