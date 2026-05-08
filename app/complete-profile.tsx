// complete-profile.tsx
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const { user, clearAuth, updateProfileStatus, setIsNewSignup } = useAuthStore();

  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      console.log('⚠️ No user found → redirecting to login');
      router.replace('/login');
      return;
    }

    console.log('✅ User available:', user.id);
    setIsChecking(false);
  }, [user]);

  const handleContinue = async () => {
    if (!businessName.trim() || !city.trim()) {
      Alert.alert('Missing Details', 'Please enter both business name and city.');
      return;
    }

    setIsLoading(true);

    try {
      if (!user?.id) {
        Alert.alert('Session Expired');
        clearAuth();
        router.replace('/login');
        return;
      }

      const payload = {
        id: user.id,
        email: user.email,
        business_name: businessName.trim(),
        city: city.trim(),
      };

      console.log('💾 Saving profile:', payload);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ Error:', error);
        Alert.alert('Error', error.message);
        setIsLoading(false);
        return;
      }

      console.log('✅ Profile saved:', data);

      // Mark profile complete and clear new signup flag
      updateProfileStatus(true);
      setIsNewSignup(false);

      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('❌ Exception:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Clear Session', 'This will clear your current session and sign you out. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('auth-storage');
            clearAuth();
            router.replace('/login');
          } catch (err) {
            console.error('Error logging out:', err);
          }
        },
      },
    ]);
  };

  if (isChecking) {
    return (
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#4F46E5', '#7C3AED', '#9333EA']}
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
              <Text style={styles.cardMessage}>
                Tell us about your business to continue
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color="#999"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., ABC Store"
                    value={businessName}
                    onChangeText={setBusinessName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color="#999"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Mumbai"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.continueBtn}
                onPress={handleContinue}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.continueBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>🔧 Clear Session</Text>
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  hero: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  brand: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    color: '#fff',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardMessage: {
    color: 'gray',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  continueBtn: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});