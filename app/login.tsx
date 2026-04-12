import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signInWithGoogleIdToken, type AuthMode } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login' | null>(null);
  const [loadingTitle, setLoadingTitle] = useState('Signing in with Google...');
  const [loadingSub, setLoadingSub] = useState('Please wait a moment');

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: Platform.OS === 'web' ? 'http://localhost:8081' : redirectUri,
  });



  // Listen for Supabase session changes (for web OAuth redirect back)
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            try {
              // Wait for profile to be created
              await new Promise(r => setTimeout(r, 200));
              
              const { data: profile } = await supabase
                .from('profiles')
                .select('business_name, city')
                .eq('id', session.user.id)
                .maybeSingle();

              if (profile?.business_name && profile?.city) {
                router.replace('/(tabs)/home');
              } else {
                router.replace('/onboarding');
              }
            } catch (err) {
              console.error('Profile check error:', err);
            }
          }
        });

        return () => subscription?.unsubscribe();
      } catch (err) {
        console.error('Session listener setup error:', err);
      }
    }
  }, []);

  // On mount, check if user is already logged in (native only)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const checkExistingSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('business_name, city')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile?.business_name && profile?.city) {
              router.replace('/(tabs)/home');
            } else {
              router.replace('/onboarding');
            }
          }
        } catch (err) {
          console.error('Existing session check error:', err);
        }
      };
      
      checkExistingSession();
    }
  }, []);

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroRise = useRef(new Animated.Value(16)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(24)).current;
  const orbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroRise, { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(cardFade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(cardRise, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.08, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleLogin = async (mode: AuthMode) => {
    if (isLoading) return;

    setLoadingTitle(mode === 'signup' ? 'Creating your account...' : 'Signing in...');
    setLoadingSub('Please wait...');
    setIsLoading(true);
    setAuthMode(mode);

    if (Platform.OS === 'web') {
      // For WEB: Use Supabase's OAuth flow (handles ID token properly)
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:8081/',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          throw new Error(error.message || 'OAuth initialization failed');
        }
        
        // If we got a URL, redirect to it (Supabase sometimes doesn't auto-redirect on web)
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setIsLoading(false);
        setAuthMode(null);
        Alert.alert('Sign-In Error', msg);
      }
    } else {
      // For NATIVE: Use Google provider with manual token exchange
      if (!request) {
        Alert.alert('Not ready', 'OAuth not initialized yet. Please wait a moment and try again.');
        setIsLoading(false);
        setAuthMode(null);
        return;
      }

      try {
        const authResult = await promptAsync();

        if (authResult.type !== 'success') {
          setIsLoading(false);
          setAuthMode(null);
          return;
        }

        await processAuthResponse(authResult, mode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setIsLoading(false);
        setAuthMode(null);
        Alert.alert('Sign-In Error', msg);
      }
    }
  };

  const processAuthResponse = async (authResult: any, mode: AuthMode) => {
    try {
      const idToken =
        authResult.authentication?.idToken ??
        (authResult as any).params?.id_token;

      if (!idToken) {
        throw new Error('No idToken found in authResult.authentication.idToken or authResult.params.id_token');
      }

      const authData = await signInWithGoogleIdToken(idToken, mode);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user) throw new Error('No user returned from Supabase after auth.');

      // Wait for profile to be created in database
      await new Promise(r => setTimeout(r, 200));

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, city')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.business_name && profile?.city) {
        setIsLoading(false);
        setAuthMode(null);
        router.replace('/(tabs)/home');
      } else {
        setIsLoading(false);
        setAuthMode(null);
        router.replace('/onboarding');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Auth error:', errorMsg);
      setIsLoading(false);
      setAuthMode(null);
      
      // Handle user already exists error
      if (errorMsg === 'USER_ALREADY_EXISTS') {
        await supabase.auth.signOut();
        Alert.alert(
          'User Already Exists',
          'This email is already registered. Please click "Login" to sign in to your existing account.',
          [{ text: 'OK', onPress: () => {} }]
        );
      } else {
        Alert.alert('Sign-In Error', errorMsg);
      }
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgTop} />
      <Animated.View style={[styles.bgOrb, { transform: [{ scale: orbScale }] }]} />
      <View style={styles.bgBottomArc} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        {!isLoading ? (
          <>
            <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroRise }] }]}>
              <View style={styles.logoTile}>
                <Text style={styles.logoText}>24</Text>
              </View>
              <Text style={styles.brand}>Sankalp</Text>
              <Text style={styles.subtitle}>Your business, your way</Text>
            </Animated.View>

            <Animated.View style={[styles.card, { opacity: cardFade, transform: [{ translateY: cardRise }] }]}>
              <Text style={styles.title}>Welcome!</Text>
              <Text style={styles.message}>Sign in to manage your business, anytime, anywhere.</Text>

              <Pressable
                style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed, !request && styles.disabledBtn]}
                onPress={() => {
                  setLoadingTitle('Creating your account...');
                  setLoadingSub('Opening Google login...');
                  handleLogin('signup');
                }}
                disabled={!request || isLoading}
              >
                <Text style={styles.g}>G</Text>
                <Text style={styles.googleBtnText}>Sign up with Google</Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Already have an account?</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed, !request && styles.disabledBtn]}
                onPress={() => {
                  setLoadingTitle('Signing in...');
                  setLoadingSub('Opening Google login...');
                  handleLogin('login');
                }}
                disabled={!request || isLoading}
              >
                <Text style={styles.g}>G</Text>
                <Text style={styles.googleBtnText}>Login</Text>
              </Pressable>

              <Text style={styles.terms}>By continuing, you agree to our Terms of Service and Privacy Policy</Text>
            </Animated.View>
          </>
        ) : (
          <View style={styles.loadingCard}>
            <Text style={[styles.g, { fontSize: 20 }]}>G</Text>
            <Text style={styles.loadingTitle}>{loadingTitle}</Text>
            <Text style={styles.loadingSub}>{loadingSub}</Text>
            <ActivityIndicator size="large" color="#f97316" style={styles.loadingIndicator} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f7' },
  bgTop: { position: 'absolute', left: 0, right: 0, top: 0, height: '74%', backgroundColor: '#ff8a2a' },
  bgOrb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#ffa758', top: 42, right: -38 },
  bgBottomArc: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#ffd9b3', bottom: -90, left: -95, opacity: 0.6 },
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
  hero: { alignItems: 'center', marginTop: 18 },
  logoTile: { width: 84, height: 84, borderRadius: 26, backgroundColor: '#ececee', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#334155', letterSpacing: 1 },
  brand: { marginTop: 20, fontSize: 48, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
  subtitle: { marginTop: 4, fontSize: 20, lineHeight: 26, color: '#fff6e8', fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#f3f3f4', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 22, borderWidth: 1, borderColor: '#ececec', marginBottom: 14 },
  title: { fontSize: 36, lineHeight: 42, fontWeight: '900', color: '#111827' },
  message: { marginTop: 6, marginBottom: 18, color: '#7a818c', fontSize: 24, lineHeight: 30, fontWeight: '600' },
  googleBtn: { height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#dadada', backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  disabledBtn: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
  g: { fontWeight: '900', color: '#4285f4', fontSize: 18 },
  googleBtnText: { fontSize: 21, fontWeight: '800', color: '#0f172a' },
  dividerRow: { marginTop: 14, marginBottom: 12, alignItems: 'center', flexDirection: 'row', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e1e1e1' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#b4b8bf' },
  terms: { marginTop: 14, color: '#8e96a3', fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' },
  loadingCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 26 },
  loadingTitle: { fontSize: 34, fontWeight: '900', color: '#111827', textAlign: 'center' },
  loadingSub: { fontSize: 20, color: '#adb2ba', fontWeight: '700', marginBottom: 12 },
  loadingIndicator: { marginTop: 8, transform: [{ scale: 1.2 }] },
});