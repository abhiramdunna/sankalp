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
      
      // Trust RevenueCat first, then fall back to the database copy.
      const hasSubscription = await checkEntitlement(ENTITLEMENT_ID);
      
      if (hasSubscription) {
        console.log('✅ Active subscription found via RevenueCat');
        setIsSubscribed(true);
        setCanAccessPremium(true);
        setTrialDaysLeft(0);
        
        // Update local storage
        await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
        await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
        await syncActiveSubscriptionToDatabase(userId);
      } else {
        const hasDatabaseSubscription = await getDatabaseSubscriptionStatus(userId);
        console.log(`📊 Database subscription status: ${hasDatabaseSubscription ? 'active' : 'inactive'}`);

        setIsSubscribed(hasDatabaseSubscription);
        setCanAccessPremium(hasDatabaseSubscription);
        setTrialDaysLeft(0);
      }
    } catch (error) {
      if (!hasLoggedErrorRef.current) {
        console.error('Error checking access:', error);
        hasLoggedErrorRef.current = true;
      }
      setCanAccessPremium(false);
      setIsSubscribed(false);
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