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
  Keyboard, // Import Keyboard
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
  }, [filters]); // Removed searchQuery from dependency array here, handled by debounce below

  const searchItems = async () => {
    // Removed the initial check for empty query here as debounce handles it

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase.from('items').select('*').eq('status', 'active');

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      query = query.or(
        `title.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`,
      );
    }

    if (filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters.onlyMine && user) {
      query = query.eq('user_id', user.id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    setLoading(false); // Set loading false earlier

    if (error) {
      console.error('Error searching items:', error);
      setItems([]); // Clear items on error
    } else {
      setItems(data || []);
    }
  };

  // Debounced search effect
  useEffect(() => {
    // Don't search immediately if query is empty unless filters are active
    if (!searchQuery.trim() && filters.type === 'all' && !filters.onlyMine) {
       setItems([]); // Clear results if query is empty and no filters active
       setLoading(false); // Ensure loading is off
       return; // Exit early
    }

    setLoading(true); // Show loading indicator while typing/waiting for debounce
    const debounce = setTimeout(() => {
        searchItems(); // searchItems will set loading to false when done
    }, 500); // Increased debounce time slightly

    return () => clearTimeout(debounce);
  }, [searchQuery, filters]); // Re-added filters here for the debounce logic

  const handleScrollBegin = () => {
    // Close keyboard if open
    Keyboard.dismiss();
    // Close filters if open
    if (showFilters) {
      setShowFilters(false);
    }
  };

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
              { color: item.type === 'lost' ? '#b91c1c' : '#15803d' }, // Added text color for contrast
            ]}
          >
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.itemMeta}>
          {/* Displaying only date for brevity */}
          Posted {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header remains outside FlatList */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <SearchIcon size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for lost or found items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search" // Improves keyboard UX
            onSubmitEditing={searchItems} // Optional: trigger search on keyboard submit
          />
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[
              styles.filterButton,
              (filters.type !== 'all' || filters.onlyMine) &&
                styles.filterActive,
            ]}
          >
            <Filter
              size={20}
              color={
                filters.type !== 'all' || filters.onlyMine
                  ? '#0891b2' // Active color
                  : '#64748b' // Inactive color
              }
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterContainer}>
            {/* --- Type Filters --- */}
            <View style={styles.filterSection}>
              {/* Optional Title: <Text style={styles.filterTitle}>Item Type</Text> */}
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.type === 'all' && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, type: 'all' })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.type === 'all' && styles.filterOptionTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.type === 'lost' && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, type: 'lost' })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.type === 'lost' && styles.filterOptionTextActive,
                    ]}
                  >
                    Lost
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.type === 'found' && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, type: 'found' })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.type === 'found' && styles.filterOptionTextActive,
                    ]}
                  >
                    Found
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* --- My Items Filter --- */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={[
                  styles.myItemsFilter,
                  filters.onlyMine && styles.myItemsFilterActive,
                ]}
                onPress={() =>
                  setFilters({ ...filters, onlyMine: !filters.onlyMine })
                }
              >
                <Text
                  style={[
                    styles.myItemsFilterText,
                    filters.onlyMine && styles.myItemsFilterTextActive,
                  ]}
                >
                  Show Only My Items
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* FlatList handles scrolling */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={handleScrollBegin} // <-- CLOSE FILTERS ON SCROLL START
        keyboardShouldPersistTaps="handled" // Helps with tapping items while keyboard is up
        ListEmptyComponent={
          !loading ? ( // Only show empty state if not loading
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery || filters.type !== 'all' || filters.onlyMine
                  ? 'No items found matching your search/filters'
                  : 'Start typing or apply filters to search'}
              </Text>
            </View>
          ) : null // Don't show empty state while loading
        }
        // Optional: Add loading indicator
        // ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} size="large" color="#0891b2" /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Light grey background
  },
  header: {
    backgroundColor: '#ffffff', // White header background
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // Light border
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Adjusted status bar padding slightly
    paddingBottom: 10, // Add some padding at the bottom of the header
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // Combined margin rules: Added more top margin
    marginTop: 10, // <-- ADDED SPACING ABOVE SEARCH BAR (adjust as needed)
    marginHorizontal: 16,
    marginBottom: 10, // Adjusted bottom margin
    backgroundColor: '#f1f5f9', // Lighter input background
    borderRadius: 12,
    paddingHorizontal: 12, // Slightly less horizontal padding
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44, // Slightly smaller height
    fontSize: 16,
    color: '#1e293b', // Darker text
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8, // Add border radius for consistency
  },
  filterActive: {
    backgroundColor: '#e0f7fa', // Light cyan background when active
  },
  filterContainer: {
    paddingHorizontal: 16, // Align filter padding with search margin
    paddingTop: 5, // Reduced top padding
    paddingBottom: 5, // Add bottom padding before the list starts
    // Removed borderTop as header already has borderBottom
  },
  filterSection: {
    marginBottom: 10, // Space between filter sections
  },
  filterTitle: {
    fontSize: 13, // Smaller title
    fontWeight: '600',
    color: '#475569', // Slightly darker grey
    marginBottom: 8,
    marginLeft: 4, // Slight indent
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    flex: 1,
    paddingVertical: 10, // Adjusted padding
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0', // Default background
    alignItems: 'center',
    justifyContent: 'center', // Center text vertically
  },
  filterOptionActive: {
    backgroundColor: '#0891b2', // Active background (cyan)
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155', // Default text color
  },
  filterOptionTextActive: {
    color: '#ffffff', // Active text color (white)
  },
  myItemsFilter: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0', // Default background
    alignItems: 'center',
    justifyContent: 'center',
  },
  myItemsFilterActive: {
    backgroundColor: '#0891b2', // Active background (cyan)
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  myItemsFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155', // Default text color
  },
  myItemsFilterTextActive: {
    color: '#ffffff', // Active text color
  },
  listContent: {
    paddingTop: 10, // Add some space between header/filters and list
    paddingHorizontal: 16,
    paddingBottom: 30, // Ensure space at the bottom
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden', // Keep image corners rounded
    flexDirection: 'row', // Make card horizontal
    elevation: 2,
    shadowColor: '#94a3b8', // Lighter shadow color
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  itemImage: {
    width: 100, // Fixed width for image
    height: 100, // Fixed height (make it square or adjust as needed)
    resizeMode: 'cover',
  },
  itemContent: {
    flex: 1, // Take remaining space
    padding: 12,
    justifyContent: 'space-between', // Distribute content vertically
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align items to the top
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16, // Slightly smaller title
    fontWeight: '600',
    color: '#1e293b',
    flex: 1, // Allow title to wrap if long
    marginRight: 8, // Space before type badge
  },
  itemType: {
    fontSize: 10, // Smaller badge text
    fontWeight: '700', // Bolder badge text
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden', // Keep corners rounded
    // Background and text color set dynamically in renderItem
    flexShrink: 0, // Prevent badge from shrinking
  },
  itemDescription: {
    fontSize: 13, // Slightly smaller description
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 18, // Improve readability
  },
  itemMeta: {
    fontSize: 11, // Smaller meta text
    color: '#94a3b8', // Lighter meta text
  },
  emptyState: {
    flex: 1, // Take up available space if list is short
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 50, // Add margin from the top
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
});