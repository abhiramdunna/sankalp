// _layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureGoogleSignIn, suppressAuthEvent } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { initRevenueCat } from '@/lib/revenuecat';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'login',
};

function useProtectedRoute(user: any, isReady: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const { isNewSignup } = useAuthStore();

  useEffect(() => {
    if (!isReady) return;

    const firstSegment = segments[0] as string | undefined;
    const onCompleteProfile = firstSegment === 'complete-profile';
    const onLoginOrIndex = firstSegment === 'login' || firstSegment === undefined;

    console.log('🔐 Route check:', {
      user: !!user,
      hasCompleteProfile: user?.hasCompleteProfile,
      isNewSignup,
      segments,
    });

    if (!user) {
      if (!onLoginOrIndex) {
        console.log('➡️ No user → /login');
        router.replace('/login');
      }
      return;
    }

    if (isNewSignup && !user.hasCompleteProfile) {
      if (!onCompleteProfile) {
        console.log('➡️ New signup, incomplete profile → /complete-profile');
        router.replace('/complete-profile');
      }
    } else {
      if (onLoginOrIndex || onCompleteProfile) {
        console.log('➡️ → /(tabs)/home');
        router.replace('/(tabs)/home');
      }
    }
  }, [user, isReady, segments, isNewSignup]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading, setUser, setSession, setLoading, clearAuth } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const initDone = useRef(false);

  // ✅ MOVE THIS HERE - BEFORE any conditional returns
  useEffect(() => {
    initRevenueCat();
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    async function initializeApp() {
      try {
        console.log('🔍 Initializing app - restoring session...');
        configureGoogleSignIn();
        setLoading(true);

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session check error:', error);
          clearAuth();
        } else if (session?.user) {
          console.log('✅ Found existing session:', session.user.email);

          // Fetch profile to check completion status
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('business_name, city')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.log('⚠️ Could not fetch profile:', profileError);
          }

          const hasComplete = !!(profile?.business_name && profile?.city);
          console.log('📋 Profile status:', { exists: !!profile, isComplete: hasComplete });

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
            hasCompleteProfile: hasComplete,
          });
          setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        } else {
          console.log('ℹ️ No active session');
          clearAuth();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('🔄 Auth event:', event, '| suppressed:', suppressAuthEvent);

            if (event === 'SIGNED_IN' && newSession?.user) {
              if (suppressAuthEvent) {
                console.log('⏸️ SIGNED_IN suppressed — auth checks still running');
                return;
              }

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

        setIsSessionRestored(true);
        return () => subscription?.unsubscribe();
      } catch (error) {
        console.error('❌ Init error:', error);
        clearAuth();
        setIsSessionRestored(true);
      } finally {
        setAppReady(true);
        setLoading(false);
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, []);

  useProtectedRoute(user, appReady && !isLoading && isSessionRestored);

  // ✅ Now this conditional return is AFTER all hooks
  if (!appReady || isLoading || !isSessionRestored) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="complete-profile" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}