import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { LinearGradient } from 'expo-linear-gradient';

import { signInWithGoogle, type AuthMode } from '@/lib/auth';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login' | null>(null);
  const [loadingTitle, setLoadingTitle] = useState('Signing in with Google...');
  const [loadingSub, setLoadingSub] = useState('Please wait a moment');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Listen for Supabase session changes (for web OAuth redirect back)
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            try {
              const sessionJSON = JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              });
              await AsyncStorage.setItem('supabase_session', sessionJSON);
              console.log('✅ (Web) Session saved to AsyncStorage');
              
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
    let subscription: any = null;
    
    if (Platform.OS !== 'web') {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          console.log('🔐 Auth state listener detected SIGNED_IN, saving session...');
          try {
            const sessionJSON = JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            await AsyncStorage.setItem('supabase_session', sessionJSON);
            console.log('✅ (Auth listener) Session saved to AsyncStorage');
          } catch (err) {
            console.error('❌ Auth listener storage error:', err);
          }
        }
      });
      
      subscription = authSubscription;

      const checkExistingSession = async () => {
        try {
          console.log('🔍 ========== STARTUP SESSION CHECK START ==========');
          
          let session = null;
          let user = null;
          
          console.log('🔹 Step A: Trying getUser()...');
          try {
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            console.log('🔹 getUser result:', { user: currentUser?.email, error: userError?.message });
            if (currentUser) {
              user = currentUser;
              console.log('✅ getUser() found authenticated user:', currentUser.email);
            }
          } catch (err) {
            console.error('❌ getUser() threw error:', err);
          }
          
          console.log('🔹 Step B: Trying getSession()...');
          const sessionResult = await supabase.auth.getSession();
          console.log('🔹 getSession() response:', {
            hasSession: !!sessionResult.data?.session,
            hasUser: !!sessionResult.data?.session?.user,
            userEmail: sessionResult.data?.session?.user?.email,
            error: sessionResult.error?.message,
          });
          
          const { data: { session: supabaseSession }, error: sessionError } = sessionResult;
          
          if (sessionError) {
            console.warn('⚠️ Session error:', sessionError);
          }
          
          if (supabaseSession) {
            console.log('✅ Session found in Supabase:', supabaseSession.user.email);
            session = supabaseSession;
          } else {
            console.log('ℹ️ No session in Supabase, checking AsyncStorage for any auth data...');
            try {
              console.log('🔹 Reading from AsyncStorage...');
              const allKeys = await AsyncStorage.getAllKeys();
              console.log('📦 Available keys:', allKeys);
              
              const supabaseKeys = allKeys.filter(key => key.includes('supabase') || key.includes('auth'));
              console.log('📦 Supabase-related keys:', supabaseKeys);
              
              if (supabaseKeys.length > 0) {
                console.log('🔹 Found Supabase keys, reading content...');
                for (const key of supabaseKeys) {
                  const value = await AsyncStorage.getItem(key);
                  console.log(`  📦 ${key}: ${value?.substring(0, 200)}...`);
                  
                  if (value && value.includes('access_token')) {
                    console.log('🔹 This key contains session tokens! Attempting to restore...');
                    try {
                      const parsedData = JSON.parse(value);
                      if (parsedData.session) {
                        console.log('✅ Found session object in stored data');
                        await supabase.auth.setSession(parsedData.session);
                        await new Promise(r => setTimeout(r, 500));
                        const { data: { session: restoredSession } } = await supabase.auth.getSession();
                        if (restoredSession) {
                          console.log('✅ Session restored:', restoredSession.user.email);
                          session = restoredSession;
                          break;
                        }
                      } else if (parsedData.access_token) {
                        console.log('✅ Found access tokens, restoring...');
                        await supabase.auth.setSession({
                          access_token: parsedData.access_token,
                          refresh_token: parsedData.refresh_token || '',
                        });
                        await new Promise(r => setTimeout(r, 1500));
                        
                        const { data: { user: restoredUserData } } = await supabase.auth.getUser();
                        if (restoredUserData) {
                          console.log('✅ User restored via getUser():', restoredUserData.email);
                          user = restoredUserData;
                          session = {
                            user: restoredUserData,
                            access_token: parsedData.access_token,
                            refresh_token: parsedData.refresh_token,
                          };
                          break;
                        }
                        
                        console.log('⚠️ getUser() returned null, extracting from JWT...');
                        try {
                          const tokenParts = parsedData.access_token.split('.');
                          if (tokenParts.length === 3) {
                            const decoded = JSON.parse(atob(tokenParts[1]));
                            console.log('🔹 Decoded JWT - sub:', decoded.sub);
                            if (decoded.sub) {
                              user = { 
                                id: decoded.sub, 
                                email: decoded.email || '',
                              };
                              session = {
                                user,
                                access_token: parsedData.access_token,
                                refresh_token: parsedData.refresh_token,
                              };
                              console.log('✅ User ID extracted from JWT:', user.id);
                              break;
                            }
                          }
                        } catch (decodeErr) {
                          console.warn('⚠️ Could not decode JWT:', decodeErr);
                        }
                      }
                    } catch (parseErr) {
                      console.warn('⚠️ Could not parse:', parseErr);
                    }
                  }
                }
              }
              
              if (!session) {
                console.log('ℹ️ No valid session data found in AsyncStorage');
              }
            } catch (storageError) {
              console.error('❌ Error reading AsyncStorage:', storageError);
            }
          }
          
          let userId = session?.user?.id || user?.id;
          console.log('🔹 Determined user ID for profile fetch:', userId);
          
          if (userId && (session || user)) {
            console.log('✅ Have user/session, fetching profile...');
            
            if (session && !supabaseSession) {
              console.log('🔐 Restoring session for queries...');
              await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              });
              await new Promise(r => setTimeout(r, 500));
            }
            
            console.log('📋 Fetching profile for user:', userId);
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('business_name, city')
              .eq('id', userId)
              .maybeSingle();

            console.log('📊 Profile on startup:', { profile, error: profileError });

            if (profile?.business_name && profile?.city) {
              console.log('✅ Profile exists, going to home');
              setUser({
                id: userId,
                email: session?.user?.email || user?.email || '',
              });
              
              if (session) {
                setSession({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token || '',
                });
              }
              
              router.replace('/(tabs)/home');
            } else {
              console.log('📝 Profile incomplete, going to onboarding');
              setUser({
                id: userId,
                email: session?.user?.email || user?.email || '',
              });
              if (session) {
                setSession({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token || '',
                });
              }
              router.replace('/onboarding');
            }
          } else {
            console.log('ℹ️ No authenticated user found, staying on login');
          }
        } catch (err) {
          console.error('❌ Existing session check error:', err);
        } finally {
          setIsCheckingSession(false);
        }
      };
      
      checkExistingSession();
    } else {
      setIsCheckingSession(false);
    }
    
    return () => {
      subscription?.unsubscribe();
    };
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
      try {
          const data = await signInWithGoogle(mode);

          const user = data?.user;
          if (!user) throw new Error('No user returned from Supabase after auth.');

          console.log('✅ Authentication successful, user:', user.email);
          
          await new Promise(resolve => setTimeout(resolve, 1000));

          console.log('📋 Fetching user profile...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('business_name, city')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) {
            console.error('❌ Profile fetch error:', profileError);
          }

          console.log('✅ Profile data:', profile);

          setIsLoading(false);
          setAuthMode(null);

          setUser({
            id: user.id,
            email: user.email || '',
            user_metadata: user.user_metadata,
          });

          console.log('💤 Waiting for Supabase to persist session automatically...');
          await new Promise(r => setTimeout(r, 2000));
          
          console.log('🔹 Checking AsyncStorage after auth...');
          try {
            const allKeys = await AsyncStorage.getAllKeys();
            console.log('📦 All keys after auth:', allKeys);
            
            for (const key of allKeys) {
              const value = await AsyncStorage.getItem(key);
              const preview = value?.substring(0, 150) || '(empty)';
              console.log(`  📦 ${key}:`, preview);
            }
          } catch (err) {
            console.error('❌ Error reading AsyncStorage after auth:', err);
          }

          console.log('🔹 Getting current session to verify...');
          const { data: sessionCheckData } = await supabase.auth.getSession();
          console.log('🔹 Current session available?', !!sessionCheckData?.session);
          console.log('🔹 Current session user:', sessionCheckData?.session?.user?.email);

          const isProfileComplete = profile?.business_name && 
                                   profile?.business_name.trim() !== '' && 
                                   profile?.city && 
                                   profile?.city.trim() !== '';

          console.log('🔍 Is profile complete?', isProfileComplete);

          if (isProfileComplete) {
            console.log('🏠 Navigating to home...');
            router.replace('/(tabs)/home');
          } else {
            console.log('📝 Navigating to onboarding...');
            router.replace('/onboarding');
          }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ Native login error:', msg);
        setIsLoading(false);
        setAuthMode(null);

        if (msg === 'CANCELLED') return;

        if (msg === 'USER_ALREADY_EXISTS') {
          await supabase.auth.signOut();
          Alert.alert(
            'User Already Exists',
            'This email is already registered. Please click "Login" to sign in to your existing account.',
            [{ text: 'OK', onPress: () => {} }]
          );
        } else {
          Alert.alert('Sign-In Error', msg);
        }
      }
    }
  };

  return (
    <LinearGradient
      colors={['#4F46E5', '#7C3AED', '#9333EA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          {isCheckingSession ? (
            <View style={styles.splashContainer}>
              <View style={styles.splashLogo}>
                <Text style={styles.splashLogoText}>24</Text>
              </View>
              <Text style={styles.splashBrand}>Sankalp</Text>
              <Text style={styles.splashSubtitle}>Loading...</Text>
              <ActivityIndicator size="large" color="#ffffff" style={styles.splashSpinner} />
            </View>
          ) : !isLoading ? (
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
                  style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
                  onPress={() => {
                    setLoadingTitle('Creating your account...');
                    setLoadingSub('Opening Google login...');
                    handleLogin('signup');
                  }}
                  disabled={isLoading}
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
                  style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
                  onPress={() => {
                    setLoadingTitle('Signing in...');
                    setLoadingSub('Opening Google login...');
                    handleLogin('login');
                  }}
                  disabled={isLoading}
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
              <ActivityIndicator size="large" color="#ffffff" style={styles.loadingIndicator} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
  hero: { alignItems: 'center', marginTop: 18 },
  logoTile: { width: 84, height: 84, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  brand: { marginTop: 20, fontSize: 48, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
  subtitle: { marginTop: 4, fontSize: 20, lineHeight: 26, color: '#fff6e8', fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 22, marginBottom: 14 },
  title: { fontSize: 36, lineHeight: 42, fontWeight: '900', color: '#111827' },
  message: { marginTop: 6, marginBottom: 18, color: '#7a818c', fontSize: 24, lineHeight: 30, fontWeight: '600' },
  googleBtn: { height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#dadada', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  disabledBtn: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
  g: { fontWeight: '900', color: '#4285f4', fontSize: 18 },
  googleBtnText: { fontSize: 21, fontWeight: '800', color: '#0f172a' },
  dividerRow: { marginTop: 14, marginBottom: 12, alignItems: 'center', flexDirection: 'row', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e1e1e1' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#b4b8bf' },
  terms: { marginTop: 14, color: '#8e96a3', fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' },
  loadingCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 26 },
  loadingTitle: { fontSize: 34, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  loadingSub: { fontSize: 20, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginBottom: 12 },
  loadingIndicator: { marginTop: 8, transform: [{ scale: 1.2 }] },
  splashContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  splashLogo: { width: 100, height: 100, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  splashLogoText: { fontSize: 36, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  splashBrand: { fontSize: 48, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
  splashSubtitle: { fontSize: 18, color: '#fff6e8', fontWeight: '600' },
  splashSpinner: { marginTop: 12, transform: [{ scale: 1.3 }] },
});