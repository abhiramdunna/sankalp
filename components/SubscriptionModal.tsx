// components/SubscriptionModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkEntitlement,
  getDatabaseSubscriptionStatus,
  presentPaywall,
  syncActiveSubscriptionToDatabase,
  ENTITLEMENT_ID,
} from '@/lib/revenuecat';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Called immediately after a confirmed purchase/restore.
   * The parent should call forceGrantAccess() first (instant unlock),
   * then refreshAccess() in the background (to re-verify with RC/DB).
   */
  onSuccess: () => void;
  userId: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userId,
}) => {
  const [openingPaywall, setOpeningPaywall] = useState(false);
  const launchedRef = useRef(false);

  // FIX: Always reset launchedRef when the modal becomes hidden.
  // Without this, if the modal closes before the finally{} block runs
  // (race condition on fast devices), launchedRef stays true and the
  // paywall never launches on the next open.
  useEffect(() => {
    if (!visible) {
      launchedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || launchedRef.current) {
      return;
    }

    let cancelled = false;
    launchedRef.current = true;

    const closeOnce = () => {
      if (cancelled) return;
      onClose();
    };

    /**
     * Save subscription to local cache + DB, then call onSuccess().
     *
     * KEY CHANGE: onSuccess() is called BEFORE the modal closes via
     * closeOnce(). This lets the parent immediately invoke
     * forceGrantAccess() and update its state while this modal is still
     * mounted — so it isn't racing against its own unmount.
     *
     * The order is:
     *   1. Write AsyncStorage + DB  (fast, local)
     *   2. onSuccess()              → parent calls forceGrantAccess()
     *                                  → canAccessPremium = true instantly
     *   3. closeOnce()              → modal hides
     */
    const handleSubscriptionGranted = async () => {
      await syncActiveSubscriptionToDatabase(userId);
      await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
      await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
      // Notify parent FIRST so it can unlock the screen immediately.
      onSuccess();
    };

    const start = async () => {
      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to manage your subscription.');
        setOpeningPaywall(false);
        closeOnce();
        return;
      }

      setOpeningPaywall(true);

      try {
        // ── Step 1: Check if already subscribed ───────────────────────────
        const hasRevenueCatAccess = await checkEntitlement(ENTITLEMENT_ID);
        const hasDatabaseAccess = hasRevenueCatAccess
          ? false
          : await getDatabaseSubscriptionStatus(userId);
        const hasAccess = hasRevenueCatAccess || hasDatabaseAccess;

        if (cancelled) return;

        if (hasAccess) {
          // Already subscribed — treat as success so the screen unlocks.
          console.log('✅ Already subscribed — granting access');
          await handleSubscriptionGranted();
          return;
        }

        // ── Step 2: Open the paywall ───────────────────────────────────────
        // presentPaywall() internally handles ITEM_ALREADY_OWNED by calling
        // restorePurchases() and returning true if the restore succeeds.
        const purchased = await presentPaywall();

        if (cancelled) return;

        if (purchased) {
          // Normal purchase OR silent auto-restore both land here.
          await handleSubscriptionGranted();
          return;
        }

        // ── Step 3: Safety net — paywall returned false ────────────────────
        // Re-check once: entitlement may have been granted in the background
        // while the paywall UI was visible (e.g. silent restore after dismiss).
        if (cancelled) return;

        const accessAfterPaywall = await checkEntitlement(ENTITLEMENT_ID);
        if (accessAfterPaywall) {
          console.log('✅ Entitlement found after paywall close — granting access');
          await handleSubscriptionGranted();
        }
        // If still no access, user simply cancelled → do nothing, just close.

      } catch (error: any) {
        if (!cancelled) {
          Alert.alert(
            'Subscription Error',
            error?.message || 'Unable to open the paywall. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setOpeningPaywall(false);
          closeOnce();
        }
        launchedRef.current = false;
      }
    };

    start();

    return () => {
      cancelled = true;
    };
  }, [visible, userId, onClose, onSuccess]);

  if (!visible) return null;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.title}>
            {openingPaywall ? 'Opening subscription' : 'Checking access'}
          </Text>
          <Text style={styles.subtitle}>loading...</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
});