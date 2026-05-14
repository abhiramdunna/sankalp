import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  FlatList,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/lib/store';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Feature {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  bullets: string[];
  accentColor: string;
  bgLight: string;
  badge?: string;
}

const FEATURES: Feature[] = [
  {
    id: 'billing',
    title: 'Quick Billing',
    emoji: '⚡',
    tagline: 'Bill your customers in under a minute',
    bullets: ['Pick products from your list', 'Auto-calculates totals', 'Save with customer details'],
    accentColor: '#7C3AED',
    bgLight: '#F5F3FF',
    badge: 'Start here',
  },
  {
    id: 'payments',
    title: 'Payment Recording',
    emoji: '💳',
    tagline: 'Track every payment, always up to date',
    bullets: ['Log supplier payments instantly', 'Balance updates automatically', 'Date & time stamped'],
    accentColor: '#0891B2',
    bgLight: '#ECFEFF',
    badge: 'Most used',
  },
  {
    id: 'suppliers',
    title: 'Supplier Management',
    emoji: '🏢',
    tagline: 'All your suppliers in one place',
    bullets: ['Add name, phone & category', 'Browse & search easily', 'Edit details anytime'],
    accentColor: '#4F46E5',
    bgLight: '#EEF2FF',
  },
  {
    id: 'bills',
    title: 'Bill Tracking',
    emoji: '📄',
    tagline: 'Never lose track of what you owe',
    bullets: ['Record bills with items & prices', 'See paid vs pending at a glance', 'Linked to each supplier'],
    accentColor: '#DB2777',
    bgLight: '#FDF2F8',
  },
  {
    id: 'analytics',
    title: 'Reports & Insights',
    emoji: '📊',
    tagline: 'Understand your business at a glance',
    bullets: ['Total spending overview', 'Monthly payment trends', 'Filter by date or supplier'],
    accentColor: '#059669',
    bgLight: '#ECFDF5',
  },
  {
    id: 'history',
    title: 'Transaction History',
    emoji: '🕐',
    tagline: 'Every record, always available',
    bullets: ['Full log of bills & payments', 'Search any transaction', 'Export & share records'],
    accentColor: '#D97706',
    bgLight: '#FFFBEB',
  },
];

// ─── Dot Indicator ─────────────────────────────────────────────────────────────
const DotIndicator: React.FC<{ total: number; current: number; accentColor: string }> = ({
  total, current, accentColor,
}) => (
  <View style={dotStyles.row}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          dotStyles.dot,
          {
            backgroundColor: i === current ? accentColor : '#D1D5DB',
            width: i === current ? 20 : 6,
          },
        ]}
      />
    ))}
  </View>
);

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
});

// ─── Feature Card ──────────────────────────────────────────────────────────────
const FeatureCard: React.FC<{ feature: Feature; index: number; scrollX: Animated.Value }> = ({
  feature, index, scrollX,
}) => {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.94, 1, 0.94],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ width, paddingHorizontal: 20, transform: [{ scale }] }}>
      <View style={cardStyles.card}>
        {/* Top color strip */}
        <View style={[cardStyles.strip, { backgroundColor: feature.accentColor }]} />

        <View style={cardStyles.body}>
          {/* Emoji icon + badge */}
          <View style={cardStyles.iconRow}>
            <View style={[cardStyles.emojiBox, { backgroundColor: feature.bgLight }]}>
              <Text style={cardStyles.emoji}>{feature.emoji}</Text>
            </View>
            {feature.badge && (
              <View style={[cardStyles.badge, { backgroundColor: feature.bgLight }]}>
                <Text style={[cardStyles.badgeText, { color: feature.accentColor }]}>
                  {feature.badge}
                </Text>
              </View>
            )}
          </View>

          {/* Title & tagline */}
          <Text style={cardStyles.title}>{feature.title}</Text>
          <Text style={cardStyles.tagline}>{feature.tagline}</Text>

          {/* Bullet points */}
          <View style={cardStyles.bullets}>
            {feature.bullets.map((b, i) => (
              <View key={i} style={cardStyles.bulletRow}>
                <View style={[cardStyles.dot, { backgroundColor: feature.accentColor }]} />
                <Text style={cardStyles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  strip: { height: 4, width: '100%' },
  body: { padding: 24 },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  emojiBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 24,
  },
  bullets: { gap: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bulletText: { fontSize: 14, color: '#334155', fontWeight: '500', flex: 1 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const FeatureShowcase = ({ onComplete }: { onComplete?: () => void }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  React.useEffect(() => {
    const onBackPress = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        setCurrentIndex(Math.round(x / width));
      },
    }
  );

  const scrollTo = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const goNext = () => scrollTo(currentIndex + 1);
  const finish = () => {
    if (onComplete) onComplete();
    else router.replace('/(tabs)/suppliers');
  };

  const currentFeature = FEATURES[currentIndex];
  const isLast = currentIndex === FEATURES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headline}>What you can do</Text>
        <Text style={styles.sub}>Swipe to explore — takes 30 seconds</Text>
      </View>

      {/* Carousel */}
      <Animated.FlatList
        ref={flatListRef}
        data={FEATURES}
        renderItem={({ item, index }) => (
          <FeatureCard feature={item} index={index} scrollX={scrollX} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        snapToInterval={width}
        decelerationRate="fast"
        style={{ flex: 1 }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <DotIndicator
          total={FEATURES.length}
          current={currentIndex}
          accentColor={currentFeature.accentColor}
        />

        <View style={styles.btnRow}>
          {!isLast && (
            <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: currentFeature.accentColor }]}
            onPress={isLast ? finish : goNext}
            activeOpacity={0.85}
          >
            {isLast ? (
              <>
                <Ionicons name="rocket-outline" size={17} color="#fff" />
                <Text style={styles.nextText}>Get Started</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});

export default FeatureShowcase;