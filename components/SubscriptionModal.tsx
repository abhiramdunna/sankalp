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
import { checkEntitlement, getDatabaseSubscriptionStatus, presentPaywall, syncActiveSubscriptionToDatabase, ENTITLEMENT_ID } from '@/lib/revenuecat';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
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

    const start = async () => {
      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to manage your subscription.');
        setOpeningPaywall(false);
        closeOnce();
        return;
      }

      setOpeningPaywall(true);

      try {
        const hasRevenueCatAccess = await checkEntitlement(ENTITLEMENT_ID);
        const hasDatabaseAccess = hasRevenueCatAccess ? false : await getDatabaseSubscriptionStatus(userId);
        const hasAccess = hasRevenueCatAccess || hasDatabaseAccess;

        if (cancelled) return;

        if (hasAccess) {
          Alert.alert('Already Subscribed', 'You already have an active subscription!');
          return;
        }

        const purchased = await presentPaywall();

        if (cancelled) return;

        if (purchased) {
          await syncActiveSubscriptionToDatabase(userId);
          await AsyncStorage.setItem(`isSubscribed_${userId}`, 'true');
          await AsyncStorage.setItem(`subscriptionDate_${userId}`, new Date().toISOString());
          onSuccess();
        }
      } catch (error: any) {
        if (!cancelled) {
          Alert.alert('Subscription Error', error?.message || 'Unable to open the paywall. Please try again.');
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
          <Text style={styles.title}>{openingPaywall ? 'Opening subscription' : 'Checking access'}</Text>
          <Text style={styles.subtitle}>
            loading...
          </Text>
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