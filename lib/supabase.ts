import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL is missing. Check your .env file and restart with: npx expo start --clear'
  );
}
if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env file and restart with: npx expo start --clear'
  );
}

const getStorage = () => {
  // Native (iOS / Android) — always use AsyncStorage
  // IMPORTANT: Check Platform.OS FIRST before checking window,
  // because React Native's JS runtime also has window defined.
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return AsyncStorage;
  }

  // Web — use localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    return {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // SSR / Node — no-op
  return {
    getItem: (_key: string) => Promise.resolve(null),
    setItem: (_key: string, _value: string) => Promise.resolve(),
    removeItem: (_key: string) => Promise.resolve(),
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web' && typeof window !== 'undefined',
  },
});