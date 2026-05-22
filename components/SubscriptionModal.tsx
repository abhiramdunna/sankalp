// components/SubscriptionModal.tsx - RevenueCat Only (Expo compatible)
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
import { supabase } from '@/lib/supabase';
import { presentPaywall, checkEntitlement, getCustomerInfo } from '@/lib/revenuecat';

// Your product ID from RevenueCat dashboard
const PRODUCT_ID = '30_days_plan';
const ENTITLEMENT_ID = 'Sankalp Pro'; // Create this in RevenueCat dashboard

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

  // Check if user already has subscription via RevenueCat
  useEffect(() => {
    if (visible && userId) {
      checkExistingSubscription();
    }
  }, [visible, userId]);

  const checkExistingSubscription = async () => {
    try {
      // First check local storage for speed
      const localSubscribed = await AsyncStorage.getItem(`isSubscribed_${userId}`);
      if (localSubscribed === 'true') {
        setAlreadySubscribed(true);
        return;
      }

      // Check RevenueCat for active entitlement
      const hasPro = await checkEntitlement(ENTITLEMENT_ID);
      
      if (hasPro) {
        setAlreadySubscribed(true);
        await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
        await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
      } else {
        // Also check Supabase as backup
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (data && !error) {
          const expiration = data.expiration_date ? new Date(data.expiration_date) : null;
          if (expiration && expiration > new Date()) {
            setAlreadySubscribed(true);
            await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
          }
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const saveSubscriptionToSupabase = async () => {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return;

    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (!entitlement) return;

    // Use latestPurchaseDate instead of purchaseDate
    const purchaseDate = entitlement.latestPurchaseDate || new Date().toISOString();
    
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        product_id: PRODUCT_ID,
        purchase_token: customerInfo.originalAppUserId || 'revenuecat_user',
        purchase_date: purchaseDate,
        expiration_date: entitlement.expirationDate || null,
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

  const handleActivate = async () => {
    if (alreadySubscribed) {
      Alert.alert('Already Subscribed', 'You already have an active subscription!');
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Show RevenueCat paywall
      const purchased = await presentPaywall();
      
      if (purchased) {
        // Verify the purchase
        const hasPro = await checkEntitlement(ENTITLEMENT_ID);
        
        if (hasPro) {
          // Save to Supabase
          await saveSubscriptionToSupabase();
          
          // Save to local storage
          await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
          await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
          
          setAlreadySubscribed(true);
          
          Alert.alert('🎉 Success!', 'Welcome to Sankalp Pro!', [
            { text: 'Continue', onPress: () => { onSuccess(); onClose(); } },
          ]);
        } else {
          throw new Error('Purchase verification failed. Please contact support.');
        }
      }
    } catch (e: any) {
      console.warn('RevenueCat error:', e);
      Alert.alert('Purchase Error', e?.message || 'Failed to complete purchase. Please try again.');
    } finally {
      setLoading(false);
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
                <Text style={[styles.trialTitle, { color: '#166534' }]}>Sankalp Pro Active</Text>
                <Text style={[styles.trialSubtitle, { color: '#15803D' }]}>
                  You have an active subscription
                </Text>
              </View>
            </View>
          )}

          {!alreadySubscribed && isTrialActive && (
            <View style={[styles.trialBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Ionicons name="sparkles" size={24} color="#D97706" />
              <View style={styles.trialTextContainer}>
                <Text style={[styles.trialTitle, { color: '#92400E' }]}>Trial Active</Text>
                <Text style={[styles.trialSubtitle, { color: '#B45309' }]}>
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your free trial
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
            <FeatureItem 
              icon="analytics" 
              title="Real-Time Analytics" 
              description="Track live sales, revenue trends, and business insights" 
              theme={theme} 
            />
            <FeatureItem 
              icon="sparkles" 
              title="Sankalp AI Assistant" 
              description="Get instant business suggestions and recommendations" 
              theme={theme} 
            />
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: alreadySubscribed ? '#9CA3AF' : theme.colors.primary }]}
            onPress={handleActivate}
            disabled={loading || alreadySubscribed}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={alreadySubscribed ? "checkmark-circle" : "rocket-outline"} size={20} color="#fff" />
                <Text style={styles.purchaseButtonText}>
                  {alreadySubscribed ? "Already Subscribed" : "Subscribe — ₹29/month"}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 4 },
  trialBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  trialTextContainer: { marginLeft: 12, flex: 1 },
  trialTitle: { fontSize: 16, fontWeight: '800' },
  trialSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  priceCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  priceAmount: { fontSize: 48, fontWeight: '900', color: '#111', letterSpacing: -1 },
  priceDuration: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginTop: 4 },
  featuresSection: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 16 },
  featureItem: { flexDirection: 'row', marginBottom: 20 },
  featureIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  featureTextContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 4 },
  featureDescription: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  purchaseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8 },
  purchaseButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  maybeLaterButton: { alignItems: 'center', paddingVertical: 12 },
  maybeLaterText: { fontSize: 14, fontWeight: '600' },
});