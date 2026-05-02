// _layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureGoogleSignIn } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'login',
};

/**
 * SINGLE SOURCE OF TRUTH FOR NAVIGATION.
 * Login.tsx must NOT navigate after auth — it just calls signInWithGoogle and
 * updates the store. This hook reacts to store changes and routes accordingly.
 */
function useProtectedRoute(user: any, isReady: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    // Cast to string to avoid TypeScript tuple-type comparison errors
    const firstSegment = segments[0] as string | undefined;

    const onCompleteProfile = firstSegment === 'complete-profile';
    const onLoginOrIndex =
      firstSegment === 'login' ||
      firstSegment === undefined;

    console.log('🔐 Route check:', {
      user: !!user,
      hasCompleteProfile: user?.hasCompleteProfile,
      segments,
    });

    if (!user) {
      // No user — send to login (but only if not already there)
      if (!onLoginOrIndex) {
        console.log('➡️ No user → /login');
        router.replace('/login');
      }
      return;
    }

    // User exists
    if (!user.hasCompleteProfile) {
      // Needs to complete profile
      if (!onCompleteProfile) {
        console.log('➡️ Incomplete profile → /complete-profile');
        router.replace('/complete-profile');
      }
    } else {
      // Profile complete — go to home if on auth screens
      if (onLoginOrIndex || onCompleteProfile) {
        console.log('➡️ Profile complete → /(tabs)/home');
        router.replace('/(tabs)/home');
      }
    }
  }, [user, isReady, segments]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading, setUser, setSession, setLoading, clearAuth } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    async function initializeApp() {
      try {
        console.log('🔍 Initializing app...');
        configureGoogleSignIn();
        setLoading(true);

        // Check for an existing Supabase session (handles app restarts)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session check error:', error);
          clearAuth();
        } else if (session?.user) {
          console.log('✅ Found existing session:', session.user.email);

          const { data: profile } = await supabase
            .from('profiles')
            .select('business_name, city')
            .eq('id', session.user.id)
            .maybeSingle();

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
            hasCompleteProfile: !!(profile?.business_name && profile?.city),
          });
          setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        } else {
          console.log('ℹ️ No active session');
          clearAuth();
        }

        // Listen for auth state changes (triggered by signInWithGoogle in login.tsx)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('🔄 Auth event:', event);

            if (event === 'SIGNED_IN' && newSession?.user) {
              console.log('✅ SIGNED_IN:', newSession.user.email);

              const { data: profile } = await supabase
                .from('profiles')
                .select('business_name, city')
                .eq('id', newSession.user.id)
                .maybeSingle();

              setUser({
                id: newSession.user.id,
                email: newSession.user.email || '',
                user_metadata: newSession.user.user_metadata,
                hasCompleteProfile: !!(profile?.business_name && profile?.city),
              });
              setSession({
                access_token: newSession.access_token,
                refresh_token: newSession.refresh_token,
              });
            } else if (event === 'TOKEN_REFRESHED' && newSession) {
              setSession({
                access_token: newSession.access_token,
                refresh_token: newSession.refresh_token,
              });
            } else if (event === 'SIGNED_OUT') {
              console.log('👋 SIGNED_OUT');
              clearAuth();
              await AsyncStorage.removeItem('auth-storage');
            }
          }
        );

        return () => subscription?.unsubscribe();
      } catch (error) {
        console.error('❌ Init error:', error);
        clearAuth();
      } finally {
        setAppReady(true);
        setLoading(false);
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, []);

  // Navigation guard — driven entirely by store state
  useProtectedRoute(user, appReady && !isLoading);

  if (!appReady || isLoading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="complete-profile" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', headerShown: true, title: 'Modal' }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}