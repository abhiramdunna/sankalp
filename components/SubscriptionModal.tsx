// components/SubscriptionModal.tsx - With Google Play Billing Integration
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/lib/store';
import { AppTheme } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// Import react-native-iap for real billing
let RNIap: any;
try {
  RNIap = require('react-native-iap');
} catch (e) {
  console.log('react-native-iap not available in dev environment');
}

const SUBSCRIPTION_SKU = '30_days_plan';

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
      // First check local storage
      const localSubscribed = await AsyncStorage.getItem(`isSubscribed_${userId}`);
      if (localSubscribed === 'true') {
        setAlreadySubscribed(true);
        return;
      }

      // Check Supabase for active subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && !error) {
        const expiration = data.expiration_date ? new Date(data.expiration_date) : null;
        if (expiration && expiration > new Date()) {
          setAlreadySubscribed(true);
          // Update local cache
          await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
          return;
        }
      }

      // For Android, check Google Play Store
      if (Platform.OS === 'android' && RNIap) {
        try {
          await RNIap.initConnection();
          const purchases = await RNIap.getAvailablePurchases();
          
          const activeSub = purchases.find(
            (p: any) => p.productId === SUBSCRIPTION_SKU && 
            (!p.expirationDate || new Date(p.expirationDate) > new Date())
          );

          if (activeSub) {
            setAlreadySubscribed(true);
            // Update local cache
            await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
          }

          await RNIap.endConnection();
        } catch (error) {
          console.error('Error checking Google Play subscriptions:', error);
        }
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
    
    try {
      // For Android with react-native-iap - ALL purchases go through Play Store
      if (Platform.OS === 'android' && RNIap) {
        await RNIap.initConnection();
        
        try {
          const purchase = await RNIap.requestPurchase({
            skus: [SUBSCRIPTION_SKU],
            andDangerouslyFinishTransactionAutomatically: false,
          });

          if (purchase && purchase.length > 0) {
            const purchaseData = purchase[0];
            
            // Verify and save subscription to Supabase
            await saveSubscriptionToSupabase(purchaseData);
            
            // Acknowledge the purchase
            try {
              await RNIap.finishTransaction({
                purchase: purchaseData,
                isConsumable: false,
              });
            } catch (finishError) {
              console.error('Error finishing transaction:', finishError);
            }
            
            // Save locally
            await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
            await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
            await AsyncStorage.setItem(`purchaseToken_${userId}`, purchaseData.purchaseToken || '');
            
            setLoading(false);
            Alert.alert(
              '🎉 Success!',
              'Thank you for subscribing to Sankalp Pro!',
              [{ text: 'Continue', onPress: () => {
                onSuccess();
                onClose();
              }}]
            );
          }
        } catch (error: any) {
          setLoading(false);
          // Handle user cancellation
          if (error.code === 'E_USER_CANCELLED') {
            console.log('User cancelled purchase');
          } else {
            console.error('Purchase error:', error);
            Alert.alert('Purchase Error', error.message || 'Failed to process payment. Please try again.');
          }
        } finally {
          try {
            await RNIap.endConnection();
          } catch (e) {
            console.error('Error ending IAP connection:', e);
          }
        }
      } else {
        // Fallback for development/non-Android (mock subscription)
        await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
        await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
        
        // Still try to save to Supabase for demo
        await saveSubscriptionToSupabase({
          productId: 'demo_' + SUBSCRIPTION_SKU,
          purchaseToken: 'demo_token_' + Date.now(),
          transactionDate: new Date().getTime(),
        });
        
        setLoading(false);
        Alert.alert(
          '🎉 Success!',
          'Thank you for subscribing to Sankalp Pro!',
          [{ text: 'Continue', onPress: () => {
            onSuccess();
            onClose();
          }}]
        );
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Subscription error:', error);
    }
  };

  const saveSubscriptionToSupabase = async (purchaseData: any) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          product_id: purchaseData.productId || SUBSCRIPTION_SKU,
          purchase_token: purchaseData.purchaseToken || 'demo_token',
          purchase_date: new Date().toISOString(),
          expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          auto_renewing: true,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving subscription to Supabase:', error);
      }
    } catch (error) {
      console.error('Failed to update subscription in database:', error);
    }
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
          {alreadySubscribed && (
            <View style={[styles.trialBanner, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
              <View style={styles.trialTextContainer}>
                <Text style={[styles.trialTitle, { color: '#166534' }]}>Sankalp Pro</Text>
                <Text style={[styles.trialSubtitle, { color: '#15803D' }]}>
                  You already have an active subscription
                </Text>
              </View>
            </View>
          )}

          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>₹29</Text>
            <Text style={styles.priceDuration}>per month</Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <FeatureItem icon="analytics" title="Real-Time Analytics" description="Track live sales, revenue trends, and business insights" theme={theme} />
            <FeatureItem icon="sparkles" title="Sankalp AI Assistant" description="Get instant business suggestions and recommendations" theme={theme} />
          </View>
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
                {(alreadySubscribed || !isTrialActive) && (
                  <Ionicons name={alreadySubscribed ? "checkmark-circle" : "rocket-outline"} size={20} color="#fff" />
                )}
                <Text style={styles.purchaseButtonText}>
                  {alreadySubscribed ? "Already Subscribed" : isTrialActive ? "Activate" : "Subscribe — ₹29/month"}
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