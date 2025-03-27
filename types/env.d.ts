declare module '@env' {
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
}

// Add global type for expo-constants
declare module 'expo-constants' {
  export interface Constants {
    expoConfig: {
      extra: {
        supabaseUrl: string;
        supabaseAnonKey: string;
      };
    };
  }
}