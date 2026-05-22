// hooks/useSubscriptionAccess.ts
import { useEffect, useState } from 'react';
import { checkEntitlement } from '@/lib/revenuecat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const ENTITLEMENT_ID = 'Sankalp pro'; // Match your entitlement ID
const TRIAL_DAYS = 3;

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
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const checkTrialStatus = async (): Promise<{ isActive: boolean; daysLeft: number }> => {
    if (!userId) return { isActive: false, daysLeft: 0 };
    
    try {
      let trialStart = await AsyncStorage.getItem(`trialStart_${userId}`);
      
      if (!trialStart) {
        // Start trial now
        trialStart = new Date().toISOString();
        await AsyncStorage.setItem(`trialStart_${userId}`, trialStart);
        return { isActive: true, daysLeft: TRIAL_DAYS };
      }
      
      const startDate = new Date(trialStart);
      const now = new Date();
      const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, TRIAL_DAYS - elapsedDays);
      
      return { 
        isActive: remaining > 0, 
        daysLeft: remaining 
      };
    } catch (error) {
      console.error('Error checking trial:', error);
      return { isActive: false, daysLeft: 0 };
    }
  };

  const refreshAccess = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Check RevenueCat subscription
      const hasSubscription = await checkEntitlement(ENTITLEMENT_ID);
      
      if (hasSubscription) {
        // User has active subscription
        setIsSubscribed(true);
        setIsTrialActive(false);
        setCanAccessPremium(true);
        setTrialDaysLeft(0);
        
        // Update local storage
        await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
      } else {
        // No subscription, check trial
        setIsSubscribed(false);
        const trial = await checkTrialStatus();
        
        setIsTrialActive(trial.isActive);
        setTrialDaysLeft(trial.daysLeft);
        setCanAccessPremium(trial.isActive);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setCanAccessPremium(false);
    } finally {
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