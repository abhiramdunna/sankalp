import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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

// ✅ SSR-safe storage:
// - During Node.js SSR: no-op (localStorage doesn't exist)
// - In the browser: use localStorage
// - On native: use AsyncStorage
const getStorage = () => {
  // Check for browser/window first (works during Node bundling too)
  if (typeof window !== 'undefined') {
    // Browser (web or Expo web)
    return {
      getItem: (key: string) => {
        try { return Promise.resolve(window.localStorage.getItem(key)); }
        catch { return Promise.resolve(null); }
      },
      setItem: (key: string, value: string) => {
        try { window.localStorage.setItem(key, value); }
        catch { /* ignore */ }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        try { window.localStorage.removeItem(key); }
        catch { /* ignore */ }
        return Promise.resolve();
      },
    };
  }

  // Node.js / SSR environment or native without window
  if (typeof window === 'undefined' && Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return {
      getItem: (_key: string) => Promise.resolve(null),
      setItem: (_key: string, _value: string) => Promise.resolve(),
      removeItem: (_key: string) => Promise.resolve(),
    };
  }

  // React Native (iOS / Android)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-async-storage/async-storage').default;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    // Only let Supabase read the URL callback on the browser, not during SSR
    detectSessionInUrl: Platform.OS === 'web' && typeof window !== 'undefined',
  },
});