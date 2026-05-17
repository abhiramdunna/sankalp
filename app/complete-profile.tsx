import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import FeatureShowcase from '@/app/features-showcase';

// ─── Indian States ────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep',
  'Puducherry',
];

// ─── Indian Cities (top ~200 for suggestions) ────────────────────────────────
const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai',
  'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut',
  'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
  'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior',
  'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati',
  'Chandigarh', 'Solapur', 'Hubballi', 'Mysore', 'Tiruchirappalli',
  'Bareilly', 'Aligarh', 'Moradabad', 'Jalandhar', 'Bhubaneswar', 'Salem',
  'Warangal', 'Guntur', 'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Bikaner',
  'Amravati', 'Noida', 'Jamshedpur', 'Bhilai', 'Cuttack', 'Firozabad',
  'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol',
  'Rourkela', 'Nanded', 'Kolhapur', 'Ajmer', 'Akola', 'Gulbarga',
  'Jamnagar', 'Ujjain', 'Loni', 'Siliguri', 'Jhansi', 'Ulhasnagar',
  'Jammu', 'Sangli', 'Mangalore', 'Erode', 'Belgaum', 'Ambattur',
  'Tirunelveli', 'Malegaon', 'Gaya', 'Jalgaon', 'Udaipur', 'Maheshtala',
  'Vizianagaram', 'Tiruppur', 'Davanagere', 'Kozhikode', 'Akbarpur',
  'Kurnool', 'Bokaro Steel City', 'South Dumdum', 'Bellary', 'Patiala',
  'Gopalpur', 'Agartala', 'Bhagalpur', 'Muzaffarnagar', 'Bhatpara',
  'Panihati', 'Latur', 'Dhule', 'Rohtak', 'Korba', 'Bhilwara',
  'Brahmapur', 'Muzaffarpur', 'Ahmednagar', 'Mathura', 'Kollam',
  'Avadi', 'Rajpur Sonarpur', 'Sagar', 'Tumkur', 'Hisar', 'Rewari',
  'Shimoga', 'Nizamabad', 'Thrissur', 'Tirupati', 'Vellore', 'Kakinada',
];

// ─── Steps ────────────────────────────────────────────────────────────────────
type Step = 'business_name' | 'business_category' | 'city' | 'state';
const STEPS: Step[] = ['business_name', 'business_category', 'city', 'state'];

const STEP_META: Record<Step, { title: string; subtitle: string; icon: string }> = {
  business_name: {
    title: 'Business Name',
    subtitle: 'This helps us personalize your experience',
    icon: 'business-outline',
  },
  business_category: {
    title: 'What type of business?',
    subtitle: 'We use this to give you smarter AI insights',
    icon: 'grid-outline',
  },
  city: {
    title: 'Which city are you in?',
    subtitle: 'Helps with local market insights',
    icon: 'location-outline',
  },
  state: {
    title: 'Which state?',
    subtitle: 'For regional business analysis',
    icon: 'map-outline',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CompleteProfile() {
  const router = useRouter();
  const { user, clearAuth, updateProfileStatus, setIsNewSignup, isNewSignup } = useAuthStore();

  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showFeatureShowcase, setShowFeatureShowcase] = useState(false);

  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const showcaseFadeAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.96)).current;

  const currentStep = STEPS[currentStepIndex];

  useEffect(() => {
    if (!user?.id) {
      router.replace('/login');
      return;
    }
    setIsChecking(false);
    // Entrance animation
    Animated.parallel([
      Animated.spring(cardScaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [user]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStepIndex + 1) / STEPS.length,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStepIndex]);

  // Showcase fade
  useEffect(() => {
    if (showFeatureShowcase) {
      Animated.timing(showcaseFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [showFeatureShowcase]);

  // City suggestions
  const handleCityChange = useCallback((text: string) => {
    setCity(text);
    if (text.length >= 2) {
      const filtered = INDIAN_CITIES
        .filter(c => c.toLowerCase().startsWith(text.toLowerCase()))
        .slice(0, 6);
      setCitySuggestions(filtered);
    } else {
      setCitySuggestions([]);
    }
  }, []);

  // State suggestions
  const handleStateChange = useCallback((text: string) => {
    setState(text);
    if (text.length >= 2) {
      const filtered = INDIAN_STATES
        .filter(s => s.toLowerCase().startsWith(text.toLowerCase()))
        .slice(0, 6);
      setStateSuggestions(filtered);
    } else {
      setStateSuggestions([]);
    }
  }, []);

  const animateToNext = (callback: () => void) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(40);
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }),
      ]).start();
    });
  };

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 'business_name': return businessName.trim().length >= 2;
      case 'business_category': return businessCategory.trim().length >= 2;
      case 'city': return city.trim().length >= 2;
      case 'state': return state.trim().length >= 2;
    }
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    if (currentStepIndex < STEPS.length - 1) {
      animateToNext(() => setCurrentStepIndex(i => i + 1));
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStepIndex === 0) return;
    const prevIndex = currentStepIndex - 1;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(-40);
      setCurrentStepIndex(prevIndex);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }),
      ]).start();
    });
  };

  const handleSubmit = async () => {
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
        business_category: businessCategory.trim(),
        city: city.trim(),
        state: state.trim(),
      };

      console.log('💾 Saving profile:', JSON.stringify(payload));

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select();

      if (error) {
        console.error('❌ Profile save error:', error);
        Alert.alert('Error', error.message || 'Failed to save profile');
        setIsLoading(false);
        return;
      }

      console.log('✅ Profile saved:', data);

      if (isNewSignup) {
        setShowFeatureShowcase(true);
      } else {
        updateProfileStatus(true);
        router.replace('/(tabs)/suppliers');
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error('❌ Exception:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
      setIsLoading(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isChecking) {
    return (
      <LinearGradient colors={['#1E1B4B', '#312E81', '#4338CA']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A5B4FC" />
            <Text style={styles.loadingText}>Setting up your profile…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Feature Showcase ────────────────────────────────────────────────────────
  if (showFeatureShowcase) {
    return (
      <Animated.View style={[styles.showcaseContainer, { opacity: showcaseFadeAnim }]}>
        <FeatureShowcase
          onComplete={() => {
            updateProfileStatus(true);
            setIsNewSignup(false);
            router.replace('/(tabs)/suppliers');
          }}
        />
      </Animated.View>
    );
  }

  const meta = STEP_META[currentStep];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  return (
    <LinearGradient colors={['#1E1B4B', '#312E81', '#4338CA']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* ── Scrollable area (header + card + AI badge) ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.brandDot} />
                <Text style={styles.brand}>Sankalp</Text>
              </View>

              {/* Progress dots */}
              <View style={styles.dotsRow}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentStepIndex && styles.dotActive,
                      i < currentStepIndex && styles.dotDone,
                    ]}
                  />
                ))}
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              <Text style={styles.stepLabel}>
                Step {currentStepIndex + 1} of {STEPS.length}
              </Text>
            </View>

            {/* Animated step card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }, { scale: cardScaleAnim }],
                },
              ]}
            >
              {/* Step icon + title */}
              <View style={styles.stepIconWrap}>
                <Ionicons name={meta.icon as any} size={28} color="#4F46E5" />
              </View>
              <Text style={styles.cardTitle}>{meta.title}</Text>
              <Text style={styles.cardSubtitle}>{meta.subtitle}</Text>

              {/* ── STEP: Business Name ───────────────────────────── */}
              {currentStep === 'business_name' && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <Ionicons name="business-outline" size={18} color="#6366F1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Sharma General Store"
                      placeholderTextColor="#9CA3AF"
                      value={businessName}
                      onChangeText={setBusinessName}
                      autoFocus
                      returnKeyType="next"
                      onSubmitEditing={handleNext}
                    />
                  </View>
                </View>
              )}

              {/* ── STEP: Business Category ───────────────────────── */}
              {currentStep === 'business_category' && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <Ionicons name="grid-outline" size={18} color="#6366F1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Grocery & Kirana, Pharmacy, Electronics…"
                      placeholderTextColor="#9CA3AF"
                      value={businessCategory}
                      onChangeText={setBusinessCategory}
                      autoFocus
                      returnKeyType="next"
                      onSubmitEditing={handleNext}
                    />
                    {businessCategory.length > 0 && (
                      <TouchableOpacity onPress={() => setBusinessCategory('')}>
                        <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* ── STEP: City ────────────────────────────────────── */}
              {currentStep === 'city' && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <Ionicons name="location-outline" size={18} color="#6366F1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Hyderabad"
                      placeholderTextColor="#9CA3AF"
                      value={city}
                      onChangeText={handleCityChange}
                      autoFocus
                      returnKeyType="next"
                      onSubmitEditing={handleNext}
                    />
                    {city.length > 0 && (
                      <TouchableOpacity onPress={() => { setCity(''); setCitySuggestions([]); }}>
                        <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {citySuggestions.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      {citySuggestions.map(suggestion => (
                        <TouchableOpacity
                          key={suggestion}
                          style={styles.suggestionRow}
                          onPress={() => {
                            setCity(suggestion);
                            setCitySuggestions([]);
                            Keyboard.dismiss();
                          }}
                        >
                          <Ionicons name="location" size={14} color="#6366F1" />
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* ── STEP: State ───────────────────────────────────── */}
              {currentStep === 'state' && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <Ionicons name="map-outline" size={18} color="#6366F1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Andhra Pradesh"
                      placeholderTextColor="#9CA3AF"
                      value={state}
                      onChangeText={handleStateChange}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleNext}
                    />
                    {state.length > 0 && (
                      <TouchableOpacity onPress={() => { setState(''); setStateSuggestions([]); }}>
                        <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {stateSuggestions.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      {stateSuggestions.map(suggestion => (
                        <TouchableOpacity
                          key={suggestion}
                          style={styles.suggestionRow}
                          onPress={() => {
                            setState(suggestion);
                            setStateSuggestions([]);
                            Keyboard.dismiss();
                          }}
                        >
                          <Ionicons name="flag" size={14} color="#6366F1" />
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Preview of filled answers */}
              {currentStepIndex > 0 && (
                <View style={styles.summaryRow}>
                  {businessName ? (
                    <View style={styles.summaryChip}>
                      <Ionicons name="business-outline" size={12} color="#6366F1" />
                      <Text style={styles.summaryChipText} numberOfLines={1}>{businessName}</Text>
                    </View>
                  ) : null}
                  {businessCategory ? (
                    <View style={styles.summaryChip}>
                      <Ionicons name="grid-outline" size={12} color="#6366F1" />
                      <Text style={styles.summaryChipText} numberOfLines={1}>
                        {businessCategory}
                      </Text>
                    </View>
                  ) : null}
                  {city && currentStepIndex >= 3 ? (
                    <View style={styles.summaryChip}>
                      <Ionicons name="location-outline" size={12} color="#6366F1" />
                      <Text style={styles.summaryChipText} numberOfLines={1}>{city}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>

            {/* AI badge */}
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color="#A5B4FC" />
              <Text style={styles.aiBadgeText}>
                Your answers help Sankalp AI understand your business deeply
              </Text>
            </View>
          </ScrollView>

          {/* ── Action buttons — outside ScrollView so keyboard pushes them up ── */}
          <View style={styles.actionRow}>
            {currentStepIndex > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#6366F1" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.nextBtn,
                !canAdvance() && styles.nextBtnDisabled,
                currentStepIndex === 0 && styles.nextBtnFull,
              ]}
              onPress={handleNext}
              disabled={!canAdvance() || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {isLastStep ? 'Finish Setup' : 'Continue'}
                  </Text>
                  <Ionicons
                    name={isLastStep ? 'checkmark' : 'arrow-forward'}
                    size={18}
                    color="#fff"
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  inner: { flex: 1 },
  showcaseContainer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#A5B4FC', marginTop: 12, fontSize: 15, letterSpacing: 0.3 },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // ── Header ─────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginTop: 52,
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#818CF8',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#fff',
  },
  dotDone: {
    backgroundColor: '#818CF8',
  },
  progressTrack: {
    width: '70%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#818CF8',
    borderRadius: 2,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // ── Card ───────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  stepIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 28,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },

  // ── Text Input ─────────────────────────────────────────────
  inputGroup: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },

  // ── Suggestions ────────────────────────────────────────────
  suggestionsBox: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // ── Action Row ─────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    backgroundColor: '#F5F3FF',
  },
  backBtnText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 15,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  nextBtnFull: {
    flex: 1,
  },
  nextBtnDisabled: {
    backgroundColor: '#C7D2FE',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // ── Summary chips ──────────────────────────────────────────
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  summaryChipText: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '600',
    maxWidth: 120,
  },

  // ── AI Badge ───────────────────────────────────────────────
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  aiBadgeText: {
    color: '#A5B4FC',
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
    lineHeight: 17,
  },
});