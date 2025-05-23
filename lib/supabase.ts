import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Access environment variables from Constants.expoConfig.extra
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please ensure you have connected to Supabase and your environment variables are set correctly.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
