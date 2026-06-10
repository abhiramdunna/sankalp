// hooks/useSubscriptionAccess.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  rcReady,
  checkEntitlement,
  getDatabaseSubscriptionStatus,
  syncActiveSubscriptionToDatabase,
  ENTITLEMENT_ID,
} from '@/lib/revenuecat';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
   *
   * WHY THIS EXISTS:
   * After Purchases.purchasePackage() or Purchases.restorePurchases() resolves,
   * RevenueCat's customer-info cache is fresh for a few seconds, but calling
   * Purchases.invalidateCustomerInfoCache() + getCustomerInfo() again (which
   * checkEntitlement() does) sometimes returns the OLD value because the RC
   * SDK processes the receipt asynchronously. This creates a window where
   * refreshAccess() → checkEntitlement() → false, so the screen stays locked
   * even though the purchase succeeded.
   *
   * forceGrantAccess() bypasses the re-query and sets canAccessPremium = true
   * immediately. The AsyncStorage write also makes the state survive a cold
   * restart until the next proper RC check.
   */
  forceGrantAccess: () => Promise<void>;
}

export function useSubscriptionAccess(userId: string | undefined): SubscriptionAccess {
  const [canAccessPremium, setCanAccessPremium] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingRef = useRef(false);

  // ── Instant grant (no RC re-query) ─────────────────────────────────────────
  // Used by SubscriptionModal.onSuccess so the screen unlocks the moment the
  // purchase completes — not after a second slow RC check.
  const forceGrantAccess = useCallback(async () => {
    if (!userId) return;
    console.log('⚡ forceGrantAccess — unlocking premium immediately for:', userId);
    setIsSubscribed(true);
    setCanAccessPremium(true);
    setTrialDaysLeft(0);
    // Persist so a cold-restart within the next few seconds also shows unlocked.
    await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true').catch(() => {});
  }, [userId]);

  const refreshAccess = useCallback(async () => {
    if (!userId) {
      setCanAccessPremium(false);
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsLoading(true);

    try {
      console.log('🔄 Checking subscription for user:', userId);

      // ── Step 1: Wait for RevenueCat to be configured ────────────────────
      // rcReady() resolves as soon as initRevenueCat() finishes (or fails).
      // This eliminates the "no singleton instance" crash from the race
      // between app init and the first subscription check.
      const rcIsReady = await rcReady();

      if (rcIsReady) {
        // ── Step 2: RevenueCat live check (cache-busted) ──────────────────
        const hasRC = await checkEntitlement(ENTITLEMENT_ID);

        if (hasRC) {
          console.log('✅ Active subscription via RevenueCat');
          setIsSubscribed(true);
          setCanAccessPremium(true);
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
      // Covers: RC init failed, RC timeout, webhook-only flows
      const hasDB = await getDatabaseSubscriptionStatus(userId);
      console.log(`📊 Database subscription: ${hasDB ? 'active' : 'inactive'}`);

      if (hasDB) {
        setIsSubscribed(true);
        setCanAccessPremium(true);
        AsyncStorage.setItem(`isSubscribed_${userId}`, 'true').catch(() => {});
      } else {
        setIsSubscribed(false);
        setCanAccessPremium(false);
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
        setCanAccessPremium(hasCached);
        setIsSubscribed(hasCached);
      } catch {
        setCanAccessPremium(false);
        setIsSubscribed(false);
      }
      setTrialDaysLeft(0);
    } finally {
      isCheckingRef.current = false;
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  return {
    canAccessPremium,
    isSubscribed,
    isTrialActive,
    trialDaysLeft,
    isLoading,
    refreshAccess,
    forceGrantAccess,
  };
}