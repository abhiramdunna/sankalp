import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/lib/store';
import { AppTheme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: [string, string];
  details: string[];
}

const FEATURES: Feature[] = [
  {
    id: 'suppliers',
    title: 'Manage Suppliers',
    description: 'Organize all your suppliers in one place with detailed profiles and contact information.',
    icon: 'business',
    gradient: ['#667EEA', '#764BA2'],
    details: [
      'Add and organize suppliers',
      'Track supplier categories',
      'Quick access to contacts',
      'Custom notes and details',
    ],
  },
  {
    id: 'bills',
    title: 'Track Bills',
    description: 'Keep track of all bills with amounts, dates, and payment status at a glance.',
    icon: 'document-text',
    gradient: ['#F093FB', '#F5576C'],
    details: [
      'Record bill amounts',
      'Set bill dates',
      'Add items to bills',
      'Track paid vs pending',
    ],
  },
  {
    id: 'payments',
    title: 'Record Payments',
    description: 'Easily record and track payments with real-time updates to pending amounts.',
    icon: 'wallet',
    gradient: ['#4FD0E7', '#326FA8'],
    details: [
      'Quick payment entry',
      'Real-time balance updates',
      'Payment history',
      'Transaction records',
    ],
  },
  {
    id: 'analytics',
    title: 'View Analytics',
    description: 'Get insights into your spending patterns and supplier payment history.',
    icon: 'bar-chart',
    gradient: ['#43E97B', '#38F9D7'],
    details: [
      'Total spending overview',
      'Payment trends',
      'Category breakdowns',
      'Historical data',
    ],
  },
  {
    id: 'history',
    title: 'Transaction History',
    description: 'Complete audit trail of all bills and payments with date filters.',
    icon: 'time',
    gradient: ['#FA709A', '#FEE140'],
    details: [
      'Date-based filtering',
      'Full transaction logs',
      'Search capabilities',
      'Export options',
    ],
  },
];

const AnimatedFeatureCard: React.FC<{
  feature: Feature;
  scrollX: Animated.Value;
  index: number;
}> = ({ feature, scrollX, index }) => {
  const { theme } = useThemeStore();
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.8, 1, 0.8],
    extrapolate: 'clamp',
  });
  const opacity$ = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        width,
        paddingHorizontal: 20,
        transform: [{ scale }, { translateY }],
        opacity: opacity$,
      }}
    >
      <View
        style={[
          styles.featureCard,
          {
            backgroundColor: '#fff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={feature.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardHeader}
        >
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={feature.icon as any} size={40} color="#fff" />
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.featureTitle, { color: '#1F2937' }]}>{feature.title}</Text>
          <Text style={[styles.featureDescription, { color: '#6B7280', marginVertical: 12 }]}>
            {feature.description}
          </Text>

          {/* Details List */}
          <View style={{ marginTop: 16 }}>
            {feature.details.map((detail, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.colors.primary,
                    marginRight: 10,
                  }}
                />
                <Text style={{ fontSize: 13, color: '#4B5563', fontWeight: '500' }}>{detail}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const FeatureShowcase = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const currentIndex = Math.round(contentOffsetX / width);
        setCurrentIndex(currentIndex);
      },
    }
  );

  const handleGetStarted = () => {
    router.replace('/(tabs)/suppliers');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 20 }]}>
        <Text style={[styles.headerTitle, { color: '#0F172A' }]}>Welcome to Sankalp</Text>
        <Text style={[styles.headerSubtitle, { color: '#64748B' }]}>
          Manage your suppliers & payments effortlessly
        </Text>
      </View>

      {/* Feature Carousel */}
      <Animated.FlatList
        data={FEATURES}
        renderItem={({ item, index }) => (
          <AnimatedFeatureCard feature={item} scrollX={scrollX} index={index} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        snapToInterval={width}
        decelerationRate="fast"
        style={{ flex: 1, marginVertical: 20 }}
      />

      {/* Dots Indicator */}
      <View style={[styles.dotsContainer, { marginBottom: 20 }]}>
        {FEATURES.map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: currentIndex === index ? theme.colors.primary : '#D1D5DB',
                width: currentIndex === index ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Counter */}
      <Text style={[styles.counter, { color: '#64748B' }]}>
        {currentIndex + 1} of {FEATURES.length}
      </Text>

      {/* Action Buttons */}
      <View
        style={[
          styles.buttonContainer,
          { paddingBottom: insets.bottom + 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
        ]}
      >
        <TouchableOpacity
          onPress={handleGetStarted}
          style={[
            styles.getStartedBtn,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={[styles.getStartedBtnText, { color: '#fff' }]}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardContent: {
    padding: 24,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  counter: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  getStartedBtn: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default FeatureShowcase;
