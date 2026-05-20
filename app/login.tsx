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
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { signInWithGoogle, type AuthMode } from '@/lib/auth';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function getErrorMessage(err: any): string {
  if (!err) return 'Unknown error occurred';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err.message) return String(err.message);
  return String(err);
}

export default function Login() {
  const { setIsNewSignup, setUser, setSession } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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

  const handleAuth = async (mode: AuthMode) => {
    if (isLoading) return;

    setIsNewSignup(mode === 'signup');
    setLoadingTitle(mode === 'signup' ? 'Creating your account...' : 'Signing in...');
    setIsLoading(true);

    try {
      const result = await signInWithGoogle(mode);

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, city')
        .eq('id', result.user.id)
        .maybeSingle();

      setUser({
        id: result.user.id,
        email: result.user.email || '',
        user_metadata: result.user.user_metadata,
        hasCompleteProfile: !!(profile?.business_name && profile?.city),
      });
      setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      setIsLoading(false);
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error('❌ Auth error:', msg);

      setIsNewSignup(false);
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

  // Terms Modal Component
  const TermsModal = () => (
    <Modal visible={showTermsModal} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.policyModalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowTermsModal(false)}>
            <Ionicons name="close" size={28} color="#1E1B4B" />
          </TouchableOpacity>
          <Text style={styles.modalHeaderTitle}>Terms of Service</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
          <Text style={styles.modalHeading}>Sankalp - Terms of Service</Text>
          <Text style={styles.modalText}>{`1. Acceptance of Terms\n\nBy accessing and using the Sankalp application, you agree to be bound by these Terms of Service. If you do not agree, please do not use this service.\n\n2. Use License\n\nPermission is granted to temporarily download one copy of the materials on Sankalp's App for personal, non-commercial transitory viewing only.\n\n3. Disclaimer\n\nThe materials on Sankalp's App are provided on an 'as is' basis. Sankalp makes no warranties, expressed or implied.\n\n4. Limitations\n\nIn no event shall Sankalp be liable for any damages arising out of the use or inability to use the materials on the App.\n\n5. User Accounts\n\nYou must provide accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your account and password.\n\n6. Business Operations\n\nYou are solely responsible for the accuracy and legitimacy of all business data you enter into the App.\n\n7. Payment and Billing\n\n• Free Trial: Users may receive a free trial period. After the trial ends, subscription charges will apply.\n• Subscription: Charges are billed automatically on the date specified during signup.\n• Cancellation: You may cancel at any time through your account settings.\n• Refunds: All sales are final.\n\n8. Intellectual Property Rights\n\nSankalp owns all intellectual property rights for materials on the App.\n\n9. Acceptable Use Policy\n\nYou agree not to:\n• Violate any applicable law or regulation\n• Transmit unlawful, threatening, or obscene material\n• Upload viruses or malicious code\n• Engage in unauthorized access or scraping\n\n10. Suspension and Termination\n\nSankalp reserves the right to suspend or terminate your account for violation of Terms, unlawful activity, or non-payment.\n\nFor the complete Terms of Service, please visit our website or contact us at support@sankalp.app`}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Privacy Policy Modal Component
  const PrivacyModal = () => (
    <Modal visible={showPrivacyModal} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.policyModalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
            <Ionicons name="close" size={28} color="#1E1B4B" />
          </TouchableOpacity>
          <Text style={styles.modalHeaderTitle}>Privacy Policy</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
          <Text style={styles.modalHeading}>Sankalp - Privacy Policy</Text>
          <Text style={styles.modalText}>{`1. Introduction\n\nSankalp is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.\n\n2. Information We Collect\n\nWe collect:\n• Personal Information: Name, email, business details, location\n• Business Data: Sales records, customer information, billing data\n• Device Information: Device type, OS, unique identifiers\n• Usage Data: Features used, pages visited, time spent\n\n3. How We Use Your Information\n\nWe use your information to:\n• Create and maintain your account\n• Process transactions and provide services\n• Improve our service and features\n• Send service-related communications\n• Comply with legal requirements\n\n4. Data Security & Protection\n\n✓ Your data is completely safe with us\n✓ We will NOT use your data anywhere outside the App\n✓ We implement end-to-end encryption\n✓ We use secure Supabase backend with row-level security\n✓ Regular security audits and monitoring\n\n5. What We Do NOT Do\n\n✓ We do NOT sell your data to third parties\n✓ We do NOT share your customer information with anyone\n✓ We do NOT use your data for marketing purposes\n✓ We do NOT combine your data with other services\n✓ We do NOT use your data for AI training without consent\n\n6. Data Retention\n\n• Active Accounts: Data retained while you maintain the account\n• Deleted Accounts: Data permanently deleted within 30 days\n• Backup Data: Retained up to 90 days for disaster recovery\n\n7. Your Privacy Rights\n\nYou have the right to:\n• Access your data\n• Correct inaccurate information\n• Delete your data (Right to be Forgotten)\n• Receive your data in portable format\n• Withdraw consent\n\n8. Payment Information\n\n• All payments processed through secure, PCI-DSS compliant gateways\n• We do NOT store full credit card information\n• Payment data is encrypted and isolated from App data\n\n9. Contact Us\n\nFor privacy concerns:\nEmail: privacy@sankalp.app\nSupport: support@sankalp.app\n\nFor the complete Privacy Policy, please visit our website.`}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

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
              {/* ── Hero ── */}
              <Animated.View
                style={[
                  styles.hero,
                  { opacity: heroFade, transform: [{ translateY: heroRise }] },
                ]}
              >
                <View style={styles.brandRow}>
                  <Text style={styles.brand}>Sankalp</Text>
                </View>
                <Text style={styles.subtitle}>Your business, your way</Text>
              </Animated.View>

              {/* ── Card ── */}
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

                <View style={styles.termsContainer}>
                  <Text style={styles.termsLabel}>By continuing, you agree to our</Text>
                  <View style={styles.termsButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.termsButton, styles.termsButtonFirst]}
                      onPress={() => setShowTermsModal(true)}
                    >
                      <Text style={styles.termsButtonText}>Terms of Service</Text>
                    </TouchableOpacity>
                    <Text style={styles.termsDivider}>and</Text>
                    <TouchableOpacity 
                      style={[styles.termsButton, styles.termsButtonLast]}
                      onPress={() => setShowPrivacyModal(true)}
                    >
                      <Text style={styles.termsButtonText}>Privacy Policy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
                    {modalConfig.type === 'exists' ? 'Go to Login' : 'Sign Up'}
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
      <TermsModal />
      <PrivacyModal />
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
    paddingTop: 48,
    paddingBottom: 20,
  },

  // ── Hero ────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    marginTop: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  logoTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  brand: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ── Card ────────────────────────────────────────────────────
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  message: {
    marginBottom: 16,
    color: '#A78BFA',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  googleBtn: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: { opacity: 0.78 },
  g: { fontWeight: '900', color: '#4285f4', fontSize: 20 },
  googleBtnText: { fontSize: 17, fontWeight: '800', color: '#1E1B4B' },
  dividerRow: {
    marginTop: 18,
    marginBottom: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EDE9FE' },
  dividerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A78BFA',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  terms: {
    marginTop: 18,
    color: '#C4B5FD',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  termsContainer: {
    marginTop: 12,
    alignItems: 'center',
    gap: 0,
  },
  termsLabel: {
    color: '#A78BFA',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  termsButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  termsButton: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  termsButtonFirst: {
    marginRight: 0,
  },
  termsButtonLast: {
    marginLeft: 0,
  },
  termsButtonText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  termsDivider: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '500',
    marginHorizontal: 4,
  },

  // ── Policy Modals ───────────────────────────────────────────
  policyModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '400',
    marginBottom: 32,
  },

  // ── Loading ─────────────────────────────────────────────────

  loadingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 26,
  },
  loadingTitle: { fontSize: 32, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  loadingSub: { fontSize: 18, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 12 },
  loadingIndicator: { marginTop: 8, transform: [{ scale: 1.2 }] },

  // ── Modal ───────────────────────────────────────────────────
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
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalButtonPrimary: { backgroundColor: '#7C3AED' },
  modalButtonSecondary: { backgroundColor: '#F5F3FF' },
  modalButtonTextPrimary: { color: 'white', fontWeight: '700', fontSize: 16 },
  modalButtonTextSecondary: { color: '#4338CA', fontWeight: '700', fontSize: 16 },
});