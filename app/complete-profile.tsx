// complete-profile.tsx
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CompleteProfile() {
  const router = useRouter();
  const { user, clearAuth, updateProfileStatus } = useAuthStore();
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        // ✅ Use the store user instead of getSession().
        // getSession() can return null immediately after signInWithIdToken
        // fires SIGNED_IN due to a timing race — this avoids clearing auth.
        if (!user?.id) {
          console.log('⚠️ No user in store — redirecting to login');
          router.replace('/login');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('business_name, city')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Profile check error:', error);
        }

        if (profile?.business_name && profile?.city) {
          // Already complete — update store, layout will navigate to home
          updateProfileStatus(true);
          return;
        }

        // Pre-fill any partial data
        if (profile?.business_name) setBusinessName(profile.business_name);
        if (profile?.city) setCity(profile.city);
      } catch (error) {
        console.error('Check profile error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkProfile();
  }, []);

  const handleContinue = async () => {
    if (!businessName.trim() || !city.trim()) {
      Alert.alert('Missing Details', 'Please enter both business name and city.');
      return;
    }

    setIsLoading(true);

    try {
      if (!user?.id) {
        Alert.alert('Session Expired', 'Please sign in again.');
        clearAuth();
        router.replace('/login');
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        business_name: businessName.trim(),
        city: city.trim(),
      });

      if (error) {
        console.error('❌ Profile save error:', error);
        Alert.alert('Error', 'Failed to save business details. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Profile completed');

      // ✅ Update store → useProtectedRoute in _layout.tsx navigates to home
      updateProfileStatus(true);
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#4F46E5', '#7C3AED', '#9333EA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.hero}>
              <Text style={styles.brand}>Sankalp</Text>
              <Text style={styles.subtitle}>Complete Your Profile</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Let's Get Started</Text>
              <Text style={styles.cardMessage}>Tell us about your business to continue</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="business-outline" size={18} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., ABC Store"
                    placeholderTextColor="#bbb"
                    value={businessName}
                    onChangeText={setBusinessName}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={18} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Mumbai"
                    placeholderTextColor="#bbb"
                    value={city}
                    onChangeText={setCity}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.continueBtn, isLoading && { opacity: 0.6 }]}
                onPress={handleContinue}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.continueBtnText}>Continue to Home</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#999" />
                <Text style={styles.footerText}>Your data is secured and encrypted</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  inner: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  hero: { alignItems: 'center', marginBottom: 24, paddingTop: 60 },
  brand: { marginTop: 20, fontSize: 48, fontWeight: '900', color: '#ffffff', letterSpacing: 0.2 },
  subtitle: {
    marginTop: 4, fontSize: 20, lineHeight: 26,
    color: '#fff6e8', fontWeight: '700', textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 22, marginBottom: 14,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: '#1f2937', marginBottom: 6 },
  cardMessage: { fontSize: 14, color: '#666', marginBottom: 18, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1f2937', fontWeight: '600' },
  continueBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
    marginTop: 22, elevation: 3,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  continueBtnText: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  footer: {
    alignItems: 'center', marginTop: 16,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  footerText: { color: '#999', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});