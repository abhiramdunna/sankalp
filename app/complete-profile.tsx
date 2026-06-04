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
import { useThemeStore } from '@/lib/store';

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
];

type Step = 'business_name' | 'business_category' | 'city' | 'state' | 'phone';
const STEPS: Step[] = ['business_name', 'business_category', 'city', 'state', 'phone'];

const STEP_META: Record<Step, { question: string; placeholder: string; hint: string }> = {
  business_name: {
    question: "What's your\nbusiness name?",
    placeholder: "e.g. Rahul Shoe Mart",
    hint: "Your official store or brand name",
  },
  business_category: {
    question: "What type of\nbusiness is it?",
    placeholder: "e.g. Grocery",
    hint: "Describe what you sell or offer",
  },
  city: {
    question: "Which city are\nyou based in?",
    placeholder: "e.g. Hyderabad",
    hint: "Your primary business location",
  },
  state: {
    question: "And which\nstate?",
    placeholder: "e.g. Andhra Pradesh",
    hint: "Start typing to see suggestions",
  },
  phone: {
    question: "Your business\nphone number?",
    placeholder: "e.g. 9876543210",
    hint: "Used to send SMS bills to customers",
  },
};

export default function CompleteProfile() {
  const { theme } = useThemeStore();
  const router = useRouter();
  const { user, clearAuth, updateProfileStatus, setIsNewSignup, isNewSignup } = useAuthStore();

  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showFeatureShowcase, setShowFeatureShowcase] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const successFadeAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const showcaseFadeAnim = useRef(new Animated.Value(0)).current;
  const underlineAnim = useRef(new Animated.Value(0)).current;
  const questionFadeAnim = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(30)).current;

  const currentStep = STEPS[currentStepIndex];
  const meta = STEP_META[currentStep];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  useEffect(() => {
    if (!user?.id) {
      router.replace('/login');
      return;
    }
    setIsChecking(false);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(questionFadeAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardRise, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [user]);

  useEffect(() => {
    if (showFeatureShowcase) {
      Animated.timing(showcaseFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [showFeatureShowcase]);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(underlineAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(underlineAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const handleCityChange = useCallback((text: string) => {
    setCity(text);
    if (text.length >= 2) {
      setCitySuggestions(INDIAN_CITIES.filter(c => c.toLowerCase().startsWith(text.toLowerCase())).slice(0, 5));
    } else {
      setCitySuggestions([]);
    }
  }, []);

  const handleStateChange = useCallback((text: string) => {
    setState(text);
    if (text.length >= 2) {
      setStateSuggestions(INDIAN_STATES.filter(s => s.toLowerCase().startsWith(text.toLowerCase())).slice(0, 5));
    } else {
      setStateSuggestions([]);
    }
  }, []);

  const animateTransition = (direction: 'forward' | 'back', callback: () => void) => {
    Keyboard.dismiss();
    const outX = direction === 'forward' ? -40 : 40;
    const inX = direction === 'forward' ? 40 : -40;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: outX, duration: 150, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.timing(questionFadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(inX);
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 140, friction: 11 }),
        Animated.timing(questionFadeAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 'business_name': return businessName.trim().length >= 2;
      case 'business_category': return businessCategory.trim().length >= 2;
      case 'city': return city.trim().length >= 2;
      case 'state': return state.trim().length >= 2;
      case 'phone': return /^[6-9]\d{9}$/.test(phone.trim());
    }
  };

  const shakeField = () => {
    setShowError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setShowError(false), 2500);
  };

  const handleNext = () => {
    if (!canAdvance()) {
      shakeField();
      return;
    }
    setShowError(false);
    if (currentStepIndex < STEPS.length - 1) {
      animateTransition('forward', () => setCurrentStepIndex(i => i + 1));
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStepIndex === 0) return;
    animateTransition('back', () => setCurrentStepIndex(i => i - 1));
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
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        business_name: businessName.trim(),
        business_category: businessCategory.trim(),
        city: city.trim(),
        state: state.trim(),
        phone: phone.trim(),
      });
      if (error) {
        Alert.alert('Error', error.message || 'Failed to save profile');
        setIsLoading(false);
        return;
      }
      if (isNewSignup) {
        setShowSuccessAnimation(true);
        // Run success animation then show feature showcase
        Animated.parallel([
          Animated.spring(successScaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
          Animated.timing(successFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          Animated.spring(checkScaleAnim, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start(() => {
            setTimeout(() => {
              setShowSuccessAnimation(false);
              setShowFeatureShowcase(true);
            }, 1800);
          });
        });
      } else {
        updateProfileStatus(true);
        router.replace('/(tabs)/home');
      }
      setIsLoading(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
      setIsLoading(false);
    }
  };

  const getCurrentValue = () => {
    switch (currentStep) {
      case 'business_name': return businessName;
      case 'business_category': return businessCategory;
      case 'city': return city;
      case 'state': return state;
      case 'phone': return phone;
    }
  };

  const handleChange = (text: string) => {
    switch (currentStep) {
      case 'business_name': setBusinessName(text); break;
      case 'business_category': setBusinessCategory(text); break;
      case 'city': handleCityChange(text); break;
      case 'state': handleStateChange(text); break;
      case 'phone': setPhone(text.replace(/\D/g, '').slice(0, 10)); break;
    }
  };

  const suggestions = currentStep === 'city' ? citySuggestions : currentStep === 'state' ? stateSuggestions : [];

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isChecking) {
    return (
      <LinearGradient
  colors={[theme.colors.gradientStart, theme.colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Setting up…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Success Animation ───────────────────────────────────────────────────────
  if (showSuccessAnimation) {
    return (
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
          <Animated.View style={{
            opacity: successFadeAnim,
            transform: [{ scale: successScaleAnim }],
            alignItems: 'center',
          }}>
            {/* Glow circle */}
            <View style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
            }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: 'rgba(255,255,255,0.9)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Animated.View style={{ transform: [{ scale: checkScaleAnim }] }}>
                  <Ionicons name="checkmark" size={52} color={theme.colors.primary} />
                </Animated.View>
              </View>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 10 }}>
              Profile Complete!
            </Text>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', textAlign: 'center', paddingHorizontal: 40 }}>
              You're all set. Let's explore what Sankalp can do for you.
            </Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    );
  }


  if (showFeatureShowcase) {
    return (
      <Animated.View style={[{ flex: 1 }, { opacity: showcaseFadeAnim }]}>
        <FeatureShowcase
          onComplete={() => {
            updateProfileStatus(true);
            setIsNewSignup(false);
            router.replace('/(tabs)/home');
          }}
        />
      </Animated.View>
    );
  }

  const underlineWidth = underlineAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <LinearGradient
      colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* ── Top section: logo + step counter ── */}
          <Animated.View style={[styles.topSection, { opacity: fadeAnim }]}>
            <View style={styles.brandRow}>
              <Text
  style={[
    styles.brand,
    {
      textShadowColor: `${theme.colors.primary}70`,
    },
  ]}
>
  Sankalp
</Text>
            </View>

            <Text style={styles.stepCounter}>{currentStepIndex + 1} of {STEPS.length}</Text>
          </Animated.View>

          {/* ── White card (question + input) ── */}
          <Animated.View
            style={[
              styles.card,
{
  opacity: fadeAnim,
  transform: [{ translateY: cardRise }],
  borderColor: `${theme.colors.primary}15`,
  shadowColor: theme.colors.primary,
},
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.cardContent}
            >
              {/* Question */}
              <Animated.View
                style={[
                  styles.questionArea,
                  { opacity: questionFadeAnim, transform: [{ translateX: slideAnim }] },
                ]}
              >
                <Text style={[styles.stepTag, { color: `${theme.colors.primary}99` }]}>
                  {String(currentStepIndex + 1).padStart(2, '0')} —
                </Text>
                <Text style={styles.question}>{meta.question}</Text>
                <Text style={[styles.hint, { color: `${theme.colors.primary}99` }]}>{meta.hint}</Text>
              </Animated.View>

              {/* Input */}
              <Animated.View
                style={[
                  styles.inputArea,
                  { opacity: fadeAnim, transform: [{ translateX: slideAnim }, { translateX: shakeAnim }] },
                ]}
              >
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={meta.placeholder}
                    placeholderTextColor={`${theme.colors.primary}70`}
                    value={getCurrentValue()}
                    onChangeText={(text) => { handleChange(text); if (showError) setShowError(false); }}
                    autoFocus
                    returnKeyType={isLastStep ? 'done' : 'next'}
                    onSubmitEditing={handleNext}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    autoCapitalize={currentStep === 'phone' ? 'none' : 'words'}
                    keyboardType={currentStep === 'phone' ? 'phone-pad' : 'default'}
                    maxLength={currentStep === 'phone' ? 10 : currentStep === 'business_name' ? 20 : currentStep === 'business_category' ? 30 : undefined}
                  />
                  {getCurrentValue().length > 0 && (
                    <TouchableOpacity onPress={() => handleChange('')} style={styles.clearBtn}>
                      <Ionicons
  name="close-circle"
  size={20}
  color={`${theme.colors.primary}80`}
/>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Animated underline */}
                <View style={[styles.underlineTrack, showError && { backgroundColor: '#FEE2E2' }]}>
                  <Animated.View
  style={[
    styles.underlineFill,
    {
      width: underlineWidth,
      backgroundColor: showError ? '#EF4444' : theme.colors.primary,
    },
  ]}
/>
                </View>

                {/* Error message */}
                {showError && (
                  <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 6, fontWeight: '600' }}>
                    {currentStep === 'phone'
                      ? 'Enter a valid 10-digit Indian mobile number'
                      : `Please enter ${currentStep === 'business_name' ? 'your business name' :
                        currentStep === 'business_category' ? 'your business type' :
                        currentStep === 'city' ? 'your city' : 'your state'} to continue`}
                  </Text>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <View style={[styles.suggestionsBox, { borderColor: `${theme.colors.primary}30` }]}>
                    {suggestions.map((s, i) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.suggestionRow, i === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => {
                          if (currentStep === 'city') { setCity(s); setCitySuggestions([]); }
                          else { setState(s); setStateSuggestions([]); }
                          Keyboard.dismiss();
                        }}
                      >
                        <Ionicons
                          name={currentStep === 'city' ? 'location' : 'flag'}
                          size={13}
                          color={theme.colors.primary}
                        />
                        <Text style={[styles.suggestionText, { color: theme.colors.primary }]}>{s}</Text>
                        <Ionicons name="arrow-forward" size={12} color={`${theme.colors.primary}70`} style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Animated.View>

              {/* Previous answers chips */}
              {currentStepIndex > 0 && (
                <View style={styles.prevAnswers}>
                  {[
                    { step: 0, label: 'Business', value: businessName },
                    { step: 1, label: 'Category', value: businessCategory },
                    { step: 2, label: 'City', value: city },
                    { step: 3, label: 'State', value: state },
                  ].filter(a => a.step < currentStepIndex && a.value).map(a => (
                    <View key={a.step} style={[
  styles.prevChip,
  {
    backgroundColor: `${theme.colors.primary}10`,
    borderColor: `${theme.colors.primary}20`,
  },
]}>
                      <Text style={styles.prevChipLabel}>{a.label}</Text>
                      <Text style={[
  styles.prevChipValue,
  {
    color: theme.colors.primary,
  },
]} numberOfLines={1}>{a.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Enter hint */}
              {canAdvance() && (
                <View style={styles.enterHint}>
                  <Text style={[styles.enterHintText, { color: `${theme.colors.primary}70` }]}>
                    Press{' '}
                    <Text style={[
  styles.enterHintKey,
  {
    color: theme.colors.primary,
  },
]}>Return ↵</Text>
                    {' '}to continue
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actionRow}>
                {currentStepIndex > 0 ? (
                  <TouchableOpacity style={[
  styles.backBtn,
  {
    backgroundColor: `${theme.colors.primary}10`,
    borderColor: `${theme.colors.primary}20`,
  },
]} onPress={handleBack} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 44 }} />
                )}

                <TouchableOpacity
                  style={[
  styles.nextBtn,
  {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
  },
  !canAdvance() && styles.nextBtnDisabled,
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
                        size={16}
                        color="#fff"
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingBottom: 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.8)', marginTop: 14, fontSize: 16, fontWeight: '600' },

  // ── Top section ────────────────────────────────────────────
  topSection: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  stepCounter: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },

  // ── Card ───────────────────────────────────────────────────
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
    flexGrow: 1,
  },

  // ── Question area ──────────────────────────────────────────
  questionArea: {
    marginBottom: 32,
  },
  stepTag: {
    fontSize: 11,
    color: '#A78BFA',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1E1B4B',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    color: '#A78BFA',
    letterSpacing: 0.2,
  },

  // ── Input area ─────────────────────────────────────────────
  inputArea: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 22,
    color: '#1E1B4B',
    fontWeight: '700',
    paddingVertical: 10,
    letterSpacing: -0.3,
    backgroundColor: 'transparent',
  },
  clearBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  underlineTrack: {
    height: 2,
    backgroundColor: '#EDE9FE',
    borderRadius: 1,
    marginBottom: 4,
  },
  underlineFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 1,
  },

  // ── Suggestions ────────────────────────────────────────────
  suggestionsBox: {
    marginTop: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
  },
  suggestionText: {
    fontSize: 14,
    color: '#3730A3',
    fontWeight: '600',
  },

  // ── Previous answers ────────────────────────────────────────
  prevAnswers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  prevChip: {
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  prevChipLabel: {
    fontSize: 10,
    color: '#A78BFA',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  prevChipValue: {
    fontSize: 13,
    color: '#4338CA',
    fontWeight: '700',
  },

  // ── Enter hint ─────────────────────────────────────────────
  enterHint: {
    marginBottom: 20,
  },
  enterHintText: {
    fontSize: 12,
    color: '#C4B5FD',
    letterSpacing: 0.3,
  },
  enterHintKey: {
    color: '#7C3AED',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },

  // ── Action row ─────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnDisabled: {
    backgroundColor: '#DDD6FE',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});