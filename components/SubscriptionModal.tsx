// components/SubscriptionModal.tsx - With proper user-based subscription
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/lib/store';
import { AppTheme } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  isTrialActive: boolean;
  trialDaysLeft: number;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userId,
  isTrialActive,
  trialDaysLeft,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  // Check if user already has subscription
  useEffect(() => {
    if (visible && userId) {
      checkExistingSubscription();
    }
  }, [visible, userId]);

  const checkExistingSubscription = async () => {
    try {
      const isSubscribed = await AsyncStorage.getItem(`isSubscribed_${userId}`);
      if (isSubscribed === 'true') {
        setAlreadySubscribed(true);
        // Auto-close and notify parent
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSubscribe = async () => {
    // Double-check before processing
    if (alreadySubscribed) {
      Alert.alert('Already Subscribed', 'You already have an active subscription!');
      onClose();
      return;
    }
    
    setLoading(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Store subscription per user
        await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
        await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
        
        setLoading(false);
        Alert.alert(
          '🎉 Success!',
          'Thank you for subscribing to Sankalp Pro!',
          [{ text: 'Continue', onPress: () => {
            onSuccess();
            onClose();
          }}]
        );
      } catch (error) {
        setLoading(false);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    }, 1500);
  };

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Sankalp Pro</Text>
          <Text style={styles.subtitle}>Unlock premium features for your business</Text>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false}>
          {isTrialActive && !alreadySubscribed && (
            <View style={styles.trialBanner}>
              <Ionicons name="gift-outline" size={24} color="#D97706" />
              <View style={styles.trialTextContainer}>
                <Text style={styles.trialTitle}>Active Trial</Text>
                <Text style={styles.trialSubtitle}>
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
                </Text>
              </View>
            </View>
          )}

          {alreadySubscribed && (
            <View style={[styles.trialBanner, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
              <View style={styles.trialTextContainer}>
                <Text style={[styles.trialTitle, { color: '#166534' }]}>Pro Active</Text>
                <Text style={[styles.trialSubtitle, { color: '#15803D' }]}>
                  You already have an active subscription
                </Text>
              </View>
            </View>
          )}

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Special Launch Offer</Text>
            <Text style={styles.priceAmount}>₹29</Text>
            <Text style={styles.priceDuration}>per month · 30 days</Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>3-day free trial included</Text>
            </View>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <FeatureItem icon="bar-chart" title="Advanced Analytics" description="View sales trends, top products, and business insights" theme={theme} />
            <FeatureItem icon="download-outline" title="Export Reports" description="Download sales data as PDF or Excel" theme={theme} />
            <FeatureItem icon="infinite" title="Unlimited Bills" description="No restrictions on number of bills" theme={theme} />
            <FeatureItem icon="people" title="Customer Insights" description="Track repeat customers and purchase history" theme={theme} />
            <FeatureItem icon="star" title="Priority Support" description="Get help within 24 hours" theme={theme} />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: alreadySubscribed ? '#9CA3AF' : theme.colors.primary }]}
            onPress={handleSubscribe}
            disabled={loading || alreadySubscribed}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={alreadySubscribed ? "checkmark-circle" : "rocket-outline"} size={20} color="#fff" />
                <Text style={styles.purchaseButtonText}>
                  {alreadySubscribed ? "Already Subscribed" : isTrialActive ? `Continue Free Trial · ${trialDaysLeft}d left` : "Subscribe — ₹29/month"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onClose} style={styles.maybeLaterButton}>
            <Text style={[styles.maybeLaterText, { color: theme.colors.primary }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// FeatureItem and FaqItem components (same as before)
const FeatureItem: React.FC<{ icon: string; title: string; description: string; theme: AppTheme }> = 
({ icon, title, description, theme }) => (
  <View style={styles.featureItem}>
    <View style={[styles.featureIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
      <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
    </View>
    <View style={styles.featureTextContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const FaqItem: React.FC<{ question: string; answer: string; theme: AppTheme }> = ({ question, answer, theme }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.primary} />
      </View>
      {expanded && <Text style={styles.faqAnswer}>{answer}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 4 },
  trialBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A' },
  trialTextContainer: { marginLeft: 12, flex: 1 },
  trialTitle: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  trialSubtitle: { fontSize: 13, color: '#B45309', fontWeight: '600', marginTop: 2 },
  priceCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  priceLabel: { fontSize: 13, color: '#10B981', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  priceAmount: { fontSize: 48, fontWeight: '900', color: '#111', letterSpacing: -1 },
  priceDuration: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginTop: 4 },
  savingsBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 12 },
  savingsText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  featuresSection: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 16 },
  featureItem: { flexDirection: 'row', marginBottom: 20 },
  featureIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  featureTextContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 4 },
  featureDescription: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  faqSection: { paddingHorizontal: 16, marginTop: 24 },
  faqItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 10 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  faqAnswer: { fontSize: 13, color: '#6B7280', marginTop: 12, lineHeight: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  purchaseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8 },
  purchaseButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  maybeLaterButton: { alignItems: 'center', paddingVertical: 12 },
  maybeLaterText: { fontSize: 14, fontWeight: '600' },
});