import React, { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  Pressable,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import LottieView from 'lottie-react-native';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// --- No Internet Screen Component ---
const NoInternetScreen = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <View style={styles.container}>
      {/* --- Ensure this path is correct for your project --- */}
      <LottieView
        source={'../../assets/animations/no-internet.json'}
        autoPlay
        loop
        style={styles.lottie}
      />
      {/* --- End Path --- */}
      <Text style={styles.message}>No Internet Connection</Text>
      <Text style={styles.subMessage}>
        Please check your connection and try again.
      </Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
};

// --- Authentication Protection Hook ---
// Ensures navigation happens only when the app is ready and connected
function useProtectedRoute(
  session: Session | null | undefined,
  isConnected: boolean | null,
  isAppReady: boolean, // Flag indicating if Slot is rendered
) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Guard 1: Wait until the main app Slot is potentially rendered
    if (!isAppReady) {
      // console.log('useProtectedRoute: App not ready, skipping navigation checks.');
      return;
    }

    // Guard 2: These guards are technically covered by isAppReady,
    // but kept for clarity and defense-in-depth.
    // Ensure we have a definitive internet status (not null) and it's connected.
    if (isConnected !== true) {
      // console.log('useProtectedRoute: Skipping redirect checks (not connected or checking).');
      return;
    }
    // Ensure session status is determined (not undefined).
    if (session === undefined) {
      // console.log('useProtectedRoute: Skipping redirect checks (session loading).');
      return;
    }
    // --- End Guards ---

    const inAuthGroup = segments[0] === 'auth';

    // console.log('useProtectedRoute useEffect triggered (App Ready & Connected)');
    // console.log('Session:', session ? 'Exists' : 'Null');
    // console.log('Segments:', segments);
    // console.log('Is in Auth Group:', inAuthGroup);

    // --- Redirect Logic ---
    if (!session && !inAuthGroup) {
      // Not logged in, not in auth group -> go to auth
      // console.log('Redirecting to /auth');
      router.replace('/auth');
    } else if (session && inAuthGroup) {
      // Logged in, in auth group -> go to main app
      // console.log('Redirecting to /');
      router.replace('/'); // Or your main app route e.g., '/(tabs)'
    } else {
      // Logged in and in main app OR Not logged in and in auth group -> stay put
      // console.log('No redirect needed.');
    }
    // --- End Redirect Logic ---
  }, [session, segments, router, isConnected, isAppReady]); // Dependencies
}

// --- Root Layout Component ---
export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined: loading, null: logged out, Session: logged in
  const [loadingSession, setLoadingSession] = useState(true); // Tracks if initial session fetch is happening
  const [isConnected, setIsConnected] = useState<boolean | null>(null); // null: checking, false: no connection, true: connected
  const [checkingInternet, setCheckingInternet] = useState(true); // Tracks if initial internet check is happening

  // Determines if the core app (<Slot/>) is ready to be rendered.
  // This requires: Internet check complete, connection established, session check complete.
  const isAppReady =
    !checkingInternet && isConnected === true && !loadingSession;

  // Function to check connectivity and then potentially fetch the session
  const checkConnectivityAndAuth = useCallback(async () => {
    // console.log('Checking connectivity...');
    setCheckingInternet(true);
    setIsConnected(null);
    setLoadingSession(true); // Reset session loading state for retry
    setSession(undefined); // Reset session state for retry

    try {
      const netState = await NetInfo.fetch();
      // Ensure both connected AND internet is actually reachable
      const internetReachable = !!(
        netState.isConnected && netState.isInternetReachable
      );
      // console.log('NetInfo state:', netState);
      // console.log('Internet Reachable:', internetReachable);
      setIsConnected(internetReachable); // Update connection status

      if (internetReachable) {
        // console.log('Internet available, fetching session...');
        // Only fetch session if we have internet
        try {
          const {
            data: { session: currentSession },
            error: sessionError,
          } = await supabase.auth.getSession();
          if (sessionError) throw sessionError; // Handle Supabase errors
          // console.log('RootLayout: Initial session fetched:', currentSession ? 'Exists' : 'Null');
          setSession(currentSession);
        } catch (error) {
          console.error('Error getting initial session:', error);
          setSession(null); // Assume logged out on Supabase error
        } finally {
          setLoadingSession(false); // Session fetch attempt finished
        }
      } else {
        // console.log('No internet connection.');
        // No internet, so we know the session state (null) without fetching
        setSession(null);
        setLoadingSession(false); // No session fetch needed/possible
      }
    } catch (error) {
      console.error('Error checking network state:', error);
      setIsConnected(false); // Assume no connection on NetInfo error
      setSession(null); // Assume logged out
      setLoadingSession(false); // Stop loading states
    } finally {
      setCheckingInternet(false); // Internet check phase finished
    }
  }, []); // useCallback with empty dependency array ensures stable function reference

  // Initial check on mount & setup listeners
  useEffect(() => {
    // console.log('RootLayout useEffect: Initializing checks and listeners.');
    checkConnectivityAndAuth(); // Perform the first check

    // Supabase auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // console.log('RootLayout useEffect: Auth state changed:', _event, newSession ? 'Exists' : 'Null');
      // Update the session state. The rendering logic and protection hook
      // will react based on this new state and the current connectivity.
      setSession(newSession);
      // If a user logs in/out, the session check is effectively "done" again for this new state
      setLoadingSession(false);
    });

    // Network connectivity change listener
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const internetReachable = !!(
        state.isConnected && state.isInternetReachable
      );
      // console.log("NetInfo listener update - Connected:", state.isConnected, "Reachable:", state.isInternetReachable);

      // Update the connection state if it has changed
      setIsConnected((currentIsConnected) => {
        if (internetReachable !== currentIsConnected) {
          // console.log(`Connection state changed to: ${internetReachable}`);
          // Optional: If connection is lost *after* initial load,
          // you might want to immediately set session to null or trigger
          // a re-check when it comes back online. For now, just update the flag.
          // if (!internetReachable) setSession(null); // Example: Force logout display on disconnect
          return internetReachable;
        }
        return currentIsConnected; // No change
      });
    });

    // Cleanup listeners on component unmount
    return () => {
      // console.log('RootLayout useEffect: Unsubscribing listeners');
      subscription?.unsubscribe();
      netInfoUnsubscribe();
    };
  }, [checkConnectivityAndAuth]); // Run effect once on mount

  // Apply the route protection logic
  useProtectedRoute(session, isConnected, isAppReady);

  // --- Render Logic ---

  // 1. Show Loader during initial checks (Internet OR Session)
  const showInitialLoader =
    checkingInternet || (isConnected === true && loadingSession);
  if (showInitialLoader) {
    // console.log(`Rendering Loader: checkingInternet=${checkingInternet}, isConnected=${isConnected}, loadingSession=${loadingSession}`);
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  // 2. Show No Internet Screen if checks are done and connection is false
  if (!checkingInternet && isConnected === false) {
    // console.log("Rendering NoInternetScreen");
    return <NoInternetScreen onRetry={checkConnectivityAndAuth} />;
  }

  // 3. Show the actual app content (<Slot />) if ready
  if (isAppReady) {
    // console.log("Rendering App Content (Slot)");
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {/* Slot renders the appropriate child route based on the URL and auth state */}
        <Slot />
      </SafeAreaProvider>
    );
  }

  // Fallback Loader: Should ideally not be hit frequently if the states above are handled correctly.
  // Catches any edge cases or brief moments between state updates.
  // console.log(`Rendering Fallback Loader: checkingInternet=${checkingInternet}, isConnected=${isConnected}, loadingSession=${loadingSession}, isAppReady=${isAppReady}`);
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0891b2" />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  container: {
    // Styles for NoInternetScreen
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  lottie: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  message: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 10,
  },
  subMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#0891b2', // Use your theme color
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
