declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
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