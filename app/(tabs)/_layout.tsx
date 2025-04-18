import { Tabs } from 'expo-router';
import {
  Search,
  Home,
  CirclePlus as PlusCircle,
  User,
  MessageCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e5e5',
          },
          tabBarActiveTintColor: '#0891b2',
          tabBarInactiveTintColor: '#64748b',
          headerShown: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size } : { color: string; size: number }) => <Home size={size} color={color} />,
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
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
