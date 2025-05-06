import { Tabs } from 'expo-router';
import {
  Search,
  Home,
  CirclePlus as PlusCircle,
  User,
  MessageCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define dark theme colors (or import them if you have a theme file)
const darkTheme = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  border: '#444444',
  cyanAccent: '#22d3ee', // Bright Cyan for active elements
  textSecondary: '#8A8A8E', // Subdued light gray for inactive elements
};

const lightTheme = {
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9F9F9',
  border: '#E5E5E5',
  cyanAccent: '#06b6d4', // A softer cyan for active tab
  textPrimary: '#000000',
  textSecondary: '#666666',
};


export default function TabLayout() {
  return (
    // Apply dark background to SafeAreaView to prevent light flashes/borders
    <SafeAreaView style={{ flex: 1, backgroundColor: darkTheme.bgSecondary }} edges={['top']}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: lightTheme.bgSecondary,
            borderTopWidth: 0,
            borderTopColor: lightTheme.border,
          },
          tabBarActiveTintColor: lightTheme.cyanAccent,
          tabBarInactiveTintColor: lightTheme.textSecondary,
          headerShown: true,
          headerStyle: {
            height: 80,
            backgroundColor: lightTheme.bgSecondary,
            borderBottomColor: lightTheme.border,
            // Remove this line to restore shadow:
            // shadowColor: 'transparent',
            elevation: 4, // For Android shadow
          },
          headerTitleStyle: {
            color: lightTheme.textPrimary, // Set title color
            alignSelf: 'center',
          },
          headerTintColor: lightTheme.textPrimary, // Set color for back button and other icons
        }}
      >

        {/* --- Screens remain the same --- */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Home size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Search size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add Item',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <PlusCircle size={size} color={color} />
            ),
            // Consider if the "Add" button needs special styling,
            // often it's larger or styled differently.
            // tabBarButton: (props) => <CustomTabBarButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Connections',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <MessageCircle size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <User size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
