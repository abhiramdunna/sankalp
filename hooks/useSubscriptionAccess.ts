// hooks/useSubscriptionAccess.ts
//
// FIX: This hook now uses a module-level reactive store instead of isolated
// per-component state. Previously, each screen (HomeScreen, AnalyticsScreen,
// SankalpAIModal) had its own independent hook instance. When forceGrantAccess()
// was called inside SankalpAIModal after upgrading, only that component's
// canAccessPremium flipped to true. HomeScreen's profile banner and
// AnalyticsScreen's overlay stayed locked until app restart because their
// instances never heard about the change.
//
// Now: a single module-level subscription status object is shared across all
// hook instances via a lightweight pub-sub (Set of listeners). Calling
// forceGrantAccess() or refreshAccess() anywhere triggers all mounted
// useSubscriptionAccess hooks to re-render simultaneously.

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkEntitlement, getDatabaseSubscriptionStatus, ENTITLEMENT_ID, syncActiveSubscriptionToDatabase } from '@/lib/revenuecat';

// ── Module-level shared state ────────────────────────────────────────────────
// This object is shared in memory across the entire JS runtime. All hook
// instances read from and write to the same snapshot.

interface SubscriptionSnapshot {
  isSubscribed: boolean;
  canAccessPremium: boolean;
  isLoading: boolean;
}

let _snapshot: SubscriptionSnapshot = {
  isSubscribed: false,
  canAccessPremium: false,
  isLoading: true,
};

// Listener registry — every mounted hook instance registers here.
const _listeners = new Set<() => void>();

function _notifyAll() {
  _listeners.forEach(fn => fn());
}

function _setSnapshot(patch: Partial<SubscriptionSnapshot>) {
  _snapshot = { ..._snapshot, ...patch };
  _notifyAll();
}

// Tracks whether an initial check is already in flight (avoids duplicate
// network calls when multiple hooks mount at the same time on cold start).
let _initPromise: Promise<void> | null = null;

// ── Core access-check logic (runs once, shared result) ───────────────────────

async function _runAccessCheck(userId: string): Promise<void> {
  _setSnapshot({ isLoading: true });

  try {
    // Check AsyncStorage cache first for instant UI response
    const cached = await AsyncStorage.getItem(`isSubscribed_${userId}`);
    if (cached === 'true') {
      _setSnapshot({ isSubscribed: true, canAccessPremium: true, isLoading: false });
      // Don't return early — re-verify in background to keep cache honest
    }

    // Primary: RevenueCat (source of truth)
    const hasRC = await checkEntitlement(ENTITLEMENT_ID);

    if (hasRC) {
      await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
      _setSnapshot({ isSubscribed: true, canAccessPremium: true, isLoading: false });
      return;
    }

    // Fallback: Supabase subscription table (handles RC outage / Android edge cases)
    const hasDB = await getDatabaseSubscriptionStatus(userId);
    if (hasDB) {
      await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
      _setSnapshot({ isSubscribed: true, canAccessPremium: true, isLoading: false });
      return;
    }

    // No access — clear any stale cache
    await AsyncStorage.removeItem(`isSubscribed_${userId}`);
    _setSnapshot({ isSubscribed: false, canAccessPremium: false, isLoading: false });
  } catch (e) {
    console.warn('useSubscriptionAccess: access check failed', e);
    // On error, keep whatever the current snapshot says — don't flash locked UI
    _setSnapshot({ isLoading: false });
  }
}

// ── Public hook ──────────────────────────────────────────────────────────────

export function useSubscriptionAccess(userId?: string) {
  // Local state is just a version counter — triggers re-render when the
  // shared snapshot changes, without duplicating the snapshot data.
  const [, setTick] = useState(0);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Register this instance as a listener on mount; unregister on unmount.
  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  // On mount (or when userId becomes available), run the access check once.
  // Multiple hooks mounting simultaneously share a single in-flight promise.
  useEffect(() => {
    if (!userId) return;

    if (!_initPromise) {
      _initPromise = _runAccessCheck(userId).finally(() => {
        _initPromise = null;
      });
    }
  }, [userId]);

  // ── refreshAccess: re-verify with RC + DB ────────────────────────────────
  // Call this after a purchase completes to update all screens simultaneously.
  const refreshAccess = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    await _runAccessCheck(uid);
  }, []);

  // ── forceGrantAccess: instant optimistic unlock ──────────────────────────
  // Skips the RC round-trip entirely; sets canAccessPremium = true right now
  // across ALL hook instances so every screen unlocks simultaneously.
  // The caller should follow up with refreshAccess() in the background to
  // persist the state properly.
  const forceGrantAccess = useCallback(async () => {
    const uid = userIdRef.current;
    // Optimistically update shared snapshot — all screens re-render immediately
    _setSnapshot({ isSubscribed: true, canAccessPremium: true, isLoading: false });

    // Persist to AsyncStorage and sync to DB in parallel (non-blocking)
    if (uid) {
      await AsyncStorage.setItem(`isSubscribed_${uid}`, 'true');
      await AsyncStorage.setItem(`subscriptionDate_${uid}`, new Date().toISOString());
      syncActiveSubscriptionToDatabase(uid).catch(e =>
        console.warn('forceGrantAccess: DB sync failed (non-blocking)', e)
      );
    }
  }, []);

  return {
    isSubscribed: _snapshot.isSubscribed,
    canAccessPremium: _snapshot.canAccessPremium,
    isLoading: _snapshot.isLoading,
    refreshAccess,
    forceGrantAccess,
  };
}