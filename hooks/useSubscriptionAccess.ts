
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  rcReady,
  checkEntitlement,
  getDatabaseSubscriptionStatus,
  syncActiveSubscriptionToDatabase,
  ENTITLEMENT_ID,
} from '@/lib/revenuecat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionStore } from '@/lib/store';

interface SubscriptionAccess {
  canAccessPremium: boolean;
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isLoading: boolean;
  refreshAccess: () => Promise<void>;
  /**
   * Call this immediately after a successful purchase / restore to unlock
   * premium features right away — without waiting for another RC round-trip.
   * Updates the global Zustand store so ALL screens unlock instantly.
   */
  forceGrantAccess: () => Promise<void>;
}

export function useSubscriptionAccess(userId: string | undefined): SubscriptionAccess {
  // ── Global store (shared across all screens) ──────────────────────────────
  const {
    canAccessPremium,
    isSubscribed,
    isCheckingSubscription,
    grantPremiumAccess,
    revokePremiumAccess,
    setIsCheckingSubscription,
  } = useSubscriptionStore();

  const [isTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const isCheckingRef = useRef(false);

  // ── Instant grant (no RC re-query) ─────────────────────────────────────────
  // Updates the GLOBAL store — every screen using this hook unlocks immediately.
  const forceGrantAccess = useCallback(async () => {
    if (!userId) return;
    console.log('⚡ forceGrantAccess — unlocking premium globally for:', userId);
    grantPremiumAccess();
    // Persist so a cold-restart within the next few seconds also shows unlocked.
    await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true').catch(() => {});
  }, [userId, grantPremiumAccess]);

  const refreshAccess = useCallback(async () => {
    if (!userId) {
      revokePremiumAccess();
      return;
    }

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsCheckingSubscription(true);

    try {
      console.log('🔄 Checking subscription for user:', userId);

      // ── Step 1: Wait for RevenueCat to be configured ────────────────────
      const rcIsReady = await rcReady();

      if (rcIsReady) {
        // ── Step 2: RevenueCat live check (cache-busted) ──────────────────
        const hasRC = await checkEntitlement(ENTITLEMENT_ID);

        if (hasRC) {
          console.log('✅ Active subscription via RevenueCat');
          grantPremiumAccess();
          setTrialDaysLeft(0);
          // Keep DB + offline cache in sync (non-blocking)
          AsyncStorage.setItem(`isSubscribed_${userId}`, 'true').catch(() => {});
          syncActiveSubscriptionToDatabase(userId).catch((e) =>
            console.warn('Background DB sync failed:', e)
          );
          return;
        }
      } else {
        console.warn('⚠️ RevenueCat not ready — skipping RC check, falling to DB');
      }

      // ── Step 3: Supabase DB fallback ─────────────────────────────────────
      const hasDB = await getDatabaseSubscriptionStatus(userId);
      console.log(`📊 Database subscription: ${hasDB ? 'active' : 'inactive'}`);

      if (hasDB) {
        grantPremiumAccess();
        AsyncStorage.setItem(`isSubscribed_${userId}`, 'true').catch(() => {});
      } else {
        revokePremiumAccess();
        AsyncStorage.removeItem(`isSubscribed_${userId}`).catch(() => {});
        AsyncStorage.removeItem(`subscriptionDate_${userId}`).catch(() => {});
      }
      setTrialDaysLeft(0);
    } catch (error) {
      // ── Step 4: Full network failure — offline cache as last resort ───────
      console.error('useSubscriptionAccess: network error, using offline cache', error);
      try {
        const cached = await AsyncStorage.getItem(`isSubscribed_${userId}`);
        const hasCached = cached === 'true';
        console.log(`⚠️ Offline fallback — cached: ${hasCached}`);
        if (hasCached) {
          grantPremiumAccess();
        } else {
          revokePremiumAccess();
        }
      } catch {
        revokePremiumAccess();
      }
      setTrialDaysLeft(0);
    } finally {
      isCheckingRef.current = false;
      setIsCheckingSubscription(false);
    }
  }, [userId, grantPremiumAccess, revokePremiumAccess, setIsCheckingSubscription]);

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  return {
    canAccessPremium,
    isSubscribed,
    isTrialActive,
    trialDaysLeft,
    isLoading: isCheckingSubscription,
    refreshAccess,
    forceGrantAccess,
  };
}