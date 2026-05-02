// login.tsx
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { signInWithGoogle, type AuthMode } from '@/lib/auth';

WebBrowser.maybeCompleteAuthSession();

function getErrorMessage(err: any): string {
  if (!err) return 'Unknown error occurred';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err.message) return String(err.message);
  return String(err);
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: 'exists' | 'notfound';
  } | null>(null);

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroRise = useRef(new Animated.Value(16)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1, duration: 550,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(heroRise, {
        toValue: 0, duration: 550,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(cardFade, {
            toValue: 1, duration: 500,
            easing: Easing.out(Easing.cubic), useNativeDriver: true,
          }),
          Animated.timing(cardRise, {
            toValue: 0, duration: 500,
            easing: Easing.out(Easing.cubic), useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  /**
   * Handles Google auth for login or signup.
   *
   * After signInWithGoogle succeeds, Supabase fires onAuthStateChange(SIGNED_IN),
   * which _layout.tsx listens to → updates the store → useProtectedRoute navigates.
   * So we do NOT navigate here at all.
   */
  const handleAuth = async (mode: AuthMode) => {
    if (isLoading) return;

    setLoadingTitle(mode === 'signup' ? 'Creating your account...' : 'Signing in...');
    setIsLoading(true);

    try {
      await signInWithGoogle(mode);
      // ✅ Success: _layout.tsx SIGNED_IN listener handles store update + navigation.
      // We just stop the loading state. The screen will unmount when navigation happens.
      setIsLoading(false);
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error('❌ Auth error:', msg);
      setIsLoading(false);

      if (msg === 'CANCELLED') return;

      if (msg === 'NO_ACCOUNT_FOUND') {
        setModalConfig({
          title: 'Account Not Found',
          message: 'No account exists with this Google email. Would you like to sign up instead?',
          type: 'notfound',
        });
        setShowModal(true);
      } else if (msg === 'ACCOUNT_EXISTS') {
        setModalConfig({
          title: 'Account Already Exists',
          message: 'An account already exists with this email. Would you like to login instead?',
          type: 'exists',
        });
        setShowModal(true);
      } else {
        Alert.alert('Sign-In Error', msg);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalConfig(null);
  };

  return (
    <LinearGradient
      colors={['#4F46E5', '#7C3AED', '#9333EA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inner}
        >
          {!isLoading ? (
            <>
              <Animated.View
                style={[
                  styles.hero,
                  { opacity: heroFade, transform: [{ translateY: heroRise }] },
                ]}
              >
                <View style={styles.logoTile}>
                  <Text style={styles.logoText}>24</Text>
                </View>
                <Text style={styles.brand}>Sankalp</Text>
                <Text style={styles.subtitle}>Your business, your way</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.card,
                  { opacity: cardFade, transform: [{ translateY: cardRise }] },
                ]}
              >
                <Text style={styles.title}>Welcome!</Text>
                <Text style={styles.message}>
                  Sign in to manage your business, anytime, anywhere.
                </Text>

                <Pressable
                  style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
                  onPress={() => handleAuth('login')}
                  disabled={isLoading}
                >
                  <Text style={styles.g}>G</Text>
                  <Text style={styles.googleBtnText}>Login with Google</Text>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>New to Sankalp?</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
                  onPress={() => handleAuth('signup')}
                  disabled={isLoading}
                >
                  <Text style={styles.g}>G</Text>
                  <Text style={styles.googleBtnText}>Sign Up with Google</Text>
                </Pressable>

                <Text style={styles.terms}>
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
              </Animated.View>
            </>
          ) : (
            <View style={styles.loadingCard}>
              <Text style={[styles.g, { fontSize: 20 }]}>G</Text>
              <Text style={styles.loadingTitle}>{loadingTitle}</Text>
              <Text style={styles.loadingSub}>Please wait a moment</Text>
              <ActivityIndicator
                size="large"
                color="#ffffff"
                style={styles.loadingIndicator}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal for account conflict errors */}
      {modalConfig && (
        <Modal
          animationType="fade"
          transparent
          visible={showModal}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View
                style={[
                  styles.modalIcon,
                  modalConfig.type === 'exists'
                    ? styles.modalIconWarning
                    : styles.modalIconError,
                ]}
              >
                <Text style={styles.modalIconText}>
                  {modalConfig.type === 'exists' ? '⚠️' : '❌'}
                </Text>
              </View>
              <Text style={styles.modalTitle}>{modalConfig.title}</Text>
              <Text style={styles.modalMessage}>{modalConfig.message}</Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => {
                    closeModal();
                    handleAuth(modalConfig.type === 'exists' ? 'login' : 'signup');
                  }}
                >
                  <Text style={styles.modalButtonTextPrimary}>
                    {modalConfig.type === 'exists' ? 'Go to Login' : 'Sign Up Instead'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={closeModal}
                >
                  <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  hero: { alignItems: 'center', marginTop: 18 },
  logoTile: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  brand: { marginTop: 20, fontSize: 48, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
  subtitle: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 26,
    color: '#fff6e8',
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 14,
  },
  title: { fontSize: 36, lineHeight: 42, fontWeight: '900', color: '#111827' },
  message: { marginTop: 6, marginBottom: 18, color: '#7a818c', fontSize: 24, lineHeight: 30, fontWeight: '600' },
  googleBtn: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dadada',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pressed: { opacity: 0.78 },
  g: { fontWeight: '900', color: '#4285f4', fontSize: 18 },
  googleBtnText: { fontSize: 21, fontWeight: '800', color: '#0f172a' },
  dividerRow: {
    marginTop: 14,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e1e1e1' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#b4b8bf' },
  terms: {
    marginTop: 14,
    color: '#8e96a3',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 26,
  },
  loadingTitle: { fontSize: 34, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  loadingSub: { fontSize: 20, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginBottom: 12 },
  loadingIndicator: { marginTop: 8, transform: [{ scale: 1.2 }] },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIconError: { backgroundColor: '#FEE2E2' },
  modalIconWarning: { backgroundColor: '#FEF3C7' },
  modalIconText: { fontSize: 32 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalButtonPrimary: { backgroundColor: '#4F46E5' },
  modalButtonSecondary: { backgroundColor: '#F3F4F6' },
  modalButtonTextPrimary: { color: 'white', fontWeight: '600', fontSize: 14 },
  modalButtonTextSecondary: { color: '#4B5563', fontWeight: '600', fontSize: 14 },
});