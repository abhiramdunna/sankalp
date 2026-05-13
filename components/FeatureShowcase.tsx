import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/lib/store';
import { AppTheme } from '@/constants/theme';

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
    id: '1',
    title: 'Manage Suppliers',
    description: 'Organize all your suppliers in one place',
    icon: 'business',
    gradient: ['#6366F1', '#8B5CF6'],
    details: ['Add supplier details', 'Categorize suppliers', 'Track supplier info'],
  },
  {
    id: '2',
    title: 'Track Bills',
    description: 'Keep record of all bills and invoices',
    icon: 'document-text',
    gradient: ['#F59E0B', '#EC4899'],
    details: ['Create new bills', 'Set bill amounts', 'Add bill items'],
  },
  {
    id: '3',
    title: 'Record Payments',
    description: 'Log payments with date and amount',
    icon: 'checkmark-circle',
    gradient: ['#10B981', '#14B8A6'],
    details: ['Quick payment entry', 'Validate amounts', 'Payment history'],
  },
  {
    id: '4',
    title: 'View Analytics',
    description: 'Get insights into your spending',
    icon: 'bar-chart',
    gradient: ['#0EA5E9', '#06B6D4'],
    details: ['Spending trends', 'Bill statistics', 'Payment analysis'],
  },
  {
    id: '5',
    title: 'Transaction History',
    description: 'Complete audit trail of all activities',
    icon: 'list',
    gradient: ['#EF4444', '#F97316'],
    details: ['Filter by date', 'Search transactions', 'Export history'],
  },
];

export default function FeatureShowcase({ onComplete }: { onComplete: () => void }) {
  const { theme } = useThemeStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Initial animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentPage = Math.round(contentOffsetX / width);
    setCurrentIndex(currentPage);
  };

  // Animate dot indicator when current index changes
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: currentIndex,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, slideAnim]);

  const handleSkip = () => {
    onComplete();
  };

  const handleNext = () => {
    if (currentIndex < FEATURES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const dotInterpolate = (index: number) =>
    slideAnim.interpolate({
      inputRange: [index - 1, index, index + 1],
      outputRange: [8, 24, 8],
      extrapolate: 'clamp',
    });

  const dotOpacity = (index: number) =>
    slideAnim.interpolate({
      inputRange: [index - 1, index, index + 1],
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.headerTitle}>Welcome to Sankalp</Text>
        <Text style={styles.headerSubtitle}>Manage your suppliers effortlessly</Text>
      </View>

      {/* Feature Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        style={styles.carouselContainer}
      >
        {FEATURES.map((feature, index) => (
          <FeatureCard key={feature.id} feature={feature} index={index} />
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {FEATURES.map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotInterpolate(index),
                opacity: dotOpacity(index),
              },
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        ))}
      </View>

      {/* Slide Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counter}>
          {currentIndex + 1} / {FEATURES.length}
        </Text>
      </View>

      {/* Feature Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>{FEATURES[currentIndex].title}</Text>
        <Text style={styles.detailsDescription}>
          {FEATURES[currentIndex].description}
        </Text>
        <View style={styles.bulletPoints}>
          {FEATURES[currentIndex].details.map((detail, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <View
                style={[
                  styles.bulletDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <Text style={styles.bulletText}>{detail}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPress={handleSkip}
          style={[styles.skipButton, { borderColor: theme.colors.primary }]}
        >
          <Text style={[styles.skipButtonText, { color: theme.colors.primary }]}>
            Skip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === FEATURES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {currentIndex < FEATURES.length - 1 && (
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={feature.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={feature.icon as any} size={64} color="#fff" />
        </View>
        <Text style={styles.cardTitle}>{feature.title}</Text>
        <Text style={styles.cardDescription}>{feature.description}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },

  carouselContainer: {
    height: 280,
    marginVertical: 16,
  },

  featureCard: {
    width: width,
    paddingHorizontal: 16,
  },

  cardGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  iconContainer: {
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },

  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: 12,
  },

  dot: {
    height: 8,
    borderRadius: 4,
  },

  counterContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },

  counter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  detailsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  detailsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },

  detailsDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 14,
  },

  bulletPoints: {
    gap: 10,
  },

  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },

  bulletText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },

  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  skipButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  nextButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  nextButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
