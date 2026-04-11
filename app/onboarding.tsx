import { supabase } from '@/lib/supabase'; // adjust path if needed
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Onboarding() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!businessName.trim() || !city.trim()) {
      Alert.alert('Missing details', 'Please enter both business name and city.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Onboarding - Current user:', user);
      if (!user) throw new Error('No user found');

      console.log('Onboarding - Upserting profile:', {
        id: user.id,
        business_name: businessName.trim(),
        city: city.trim(),
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          business_name: businessName.trim(),
          city: city.trim(),
        });

      if (error) {
        console.log('Onboarding - Upsert error:', error);
        throw error;
      }

      console.log('Onboarding - Profile updated successfully, redirecting to dashboard');
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      console.log('Onboarding - Error:', message);
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgTop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>Almost there!</Text>
          <Text style={styles.subtitle}>Tell us about your business</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Business Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sankalp Stores"
            placeholderTextColor="#b0b0b0"
            value={businessName}
            onChangeText={setBusinessName}
            editable={!isLoading}
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Hyderabad"
            placeholderTextColor="#b0b0b0"
            value={city}
            onChangeText={setCity}
            editable={!isLoading}
          />

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.pressed, isLoading && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.btnText}>{isLoading ? 'Saving...' : 'Continue'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f7' },
  bgTop: {
    position: 'absolute', left: 0, right: 0, top: 0,
    height: '45%', backgroundColor: '#ff8a2a',
  },
  inner: {
    flex: 1, justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32,
  },
  hero: { alignItems: 'center' },
  brand: { fontSize: 36, fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: 18, color: '#fff6e8', fontWeight: '700', marginTop: 6 },
  card: {
    backgroundColor: '#f3f3f4', borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 28,
    borderWidth: 1, borderColor: '#ececec',
  },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 14 },
  input: {
    height: 52, borderRadius: 12, borderWidth: 1,
    borderColor: '#dadada', backgroundColor: '#fff',
    paddingHorizontal: 16, fontSize: 16, color: '#111827',
  },
  btn: {
    marginTop: 24, height: 56, borderRadius: 12,
    backgroundColor: '#ff8a2a', alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  disabledBtn: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});














