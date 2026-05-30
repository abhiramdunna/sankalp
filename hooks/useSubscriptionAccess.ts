// hooks/useSubscriptionAccess.ts
import { useEffect, useRef, useState } from 'react';
import { checkEntitlement, getDatabaseSubscriptionStatus, syncActiveSubscriptionToDatabase } from '@/lib/revenuecat';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTITLEMENT_ID = 'Sankalp Pro'; // Must match RevenueCat exactly!

interface SubscriptionAccess {
  canAccessPremium: boolean;
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isLoading: boolean;
  refreshAccess: () => Promise<void>;
}

export function useSubscriptionAccess(userId: string | undefined): SubscriptionAccess {
  const [canAccessPremium, setCanAccessPremium] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingRef = useRef(false);
  const hasLoggedErrorRef = useRef(false);

  const refreshAccess = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;
    hasLoggedErrorRef.current = false;
    setIsLoading(true);

    try {
      console.log('🔄 Checking subscription access for user:', userId);

      // Always hit RevenueCat servers fresh (cache is invalidated in checkEntitlement)
      const hasSubscription = await checkEntitlement(ENTITLEMENT_ID);

      if (hasSubscription) {
        console.log('✅ Active subscription found via RevenueCat');
        setIsSubscribed(true);
        setCanAccessPremium(true);
        setTrialDaysLeft(0);
        await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
        await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
        await syncActiveSubscriptionToDatabase(userId);
      } else {
        // RevenueCat says no — also check Supabase DB as fallback
        const hasDatabaseSubscription = await getDatabaseSubscriptionStatus(userId);
        console.log(`📊 Database subscription status: ${hasDatabaseSubscription ? 'active' : 'inactive'}`);

        if (hasDatabaseSubscription) {
          setIsSubscribed(true);
          setCanAccessPremium(true);
        } else {
          // Truly expired/inactive — clear any stale local cache
          setIsSubscribed(false);
          setCanAccessPremium(false);
          await AsyncStorage.removeItem(`isSubscribed_${userId}`);
          await AsyncStorage.removeItem(`subscriptionDate_${userId}`);
        }
        setTrialDaysLeft(0);
      }
    } catch (error) {
      if (!hasLoggedErrorRef.current) {
        console.error('Error checking access:', error);
        hasLoggedErrorRef.current = true;
      }
      // On network error: fall back to AsyncStorage so offline users aren't locked out
      const cached = await AsyncStorage.getItem(`isSubscribed_${userId}`);
      const hasCached = cached === 'true';
      console.log(`⚠️ Network error — using cached value: ${hasCached}`);
      setCanAccessPremium(hasCached);
      setIsSubscribed(hasCached);
      setTrialDaysLeft(0);
    } finally {
      isCheckingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAccess();
  }, [userId]);

  return {
    canAccessPremium,
    isSubscribed,
    isTrialActive,
    trialDaysLeft,
    isLoading,
    refreshAccess,
  };
}