// lib/subscription.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { db } from './database';

// Google Play Console: Create subscription with 7-day trial
// Product ID: sankalp_3month_premium
export const SUBSCRIPTION_SKU = 'sankalp_3month_premium';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  subscriptionEndsAt: Date | null;
  trialStartedAt: Date | null;
  productId: string | null;
  purchaseToken: string | null;
}

export interface PurchaseInfo {
  transactionId: string;
  purchaseToken: string;
  productId: string;
  purchaseDate: Date;
  expirationDate: Date | null;
  autoRenewing: boolean;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private cachedStatus: SubscriptionStatus | null = null;
  private statusListeners: ((status: SubscriptionStatus) => void)[] = [];

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Initialize subscription service - call on app start after user login
   */
  async initialize(userId: string): Promise<void> {
    try {
      // Check local trial start
      let trialStart = await AsyncStorage.getItem('trialStart_' + userId);
      
      if (!trialStart) {
        trialStart = new Date().toISOString();
        await AsyncStorage.setItem('trialStart_' + userId, trialStart);
      }

      // Check for active Google Play subscription
      const purchaseInfo = await this.getActiveSubscriptionFromStore();
      
      if (purchaseInfo) {
        // User has active Play Store subscription
        await this.updateSubscriptionInSupabase(userId, purchaseInfo);
        await this.saveSubscriptionStatus(true);
      }

      await this.refreshStatus(userId);
    } catch (error) {
      console.error('Subscription initialization error:', error);
    }
  }

  /**
   * Get subscription status from Google Play Store
   */
  async getActiveSubscriptionFromStore(): Promise<PurchaseInfo | null> {
    if (Platform.OS !== 'android') {
      console.log('Google Play Billing only available on Android');
      return null;
    }

    try {
      const RNIap = require('react-native-iap');
      
      // Initialize IAP
      await RNIap.initConnection();
      
      // Get purchases
      const purchases = await RNIap.getAvailablePurchases();
      
      const activeSubscription = purchases.find(
        (p: any) => p.productId === SUBSCRIPTION_SKU && 
        p.transactionReceipt && 
        (!p.expirationDate || new Date(p.expirationDate) > new Date())
      );

      if (activeSubscription) {
        return {
          transactionId: activeSubscription.transactionId,
          purchaseToken: activeSubscription.purchaseToken,
          productId: activeSubscription.productId,
          purchaseDate: new Date(activeSubscription.transactionDate),
          expirationDate: activeSubscription.expirationDate ? new Date(activeSubscription.expirationDate) : null,
          autoRenewing: activeSubscription.autoRenewingAndroid || false,
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking subscriptions:', error);
      return null;
    }
  }

  /**
   * Update subscription info in Supabase
   */
  private async updateSubscriptionInSupabase(userId: string, purchaseInfo: PurchaseInfo): Promise<void> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          product_id: purchaseInfo.productId,
          purchase_token: purchaseInfo.purchaseToken,
          purchase_date: purchaseInfo.purchaseDate.toISOString(),
          expiration_date: purchaseInfo.expirationDate?.toISOString() || null,
          auto_renewing: purchaseInfo.autoRenewing,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving subscription to Supabase:', error);
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  }

  /**
   * Refresh subscription status
   */
  async refreshStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      // Check Play Store subscription first
      const purchaseInfo = await this.getActiveSubscriptionFromStore();
      
      let isSubscribed = false;
      let subscriptionEndsAt: Date | null = null;
      
      if (purchaseInfo && (!purchaseInfo.expirationDate || purchaseInfo.expirationDate > new Date())) {
        isSubscribed = true;
        subscriptionEndsAt = purchaseInfo.expirationDate;
      } else {
        // Check Supabase for subscription status
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (data && !error) {
          const expiration = data.expiration_date ? new Date(data.expiration_date) : null;
          if (expiration && expiration > new Date()) {
            isSubscribed = true;
            subscriptionEndsAt = expiration;
          }
        }
      }

      // Get trial info
      const trialStartStr = await AsyncStorage.getItem('trialStart_' + userId);
      const trialStartedAt = trialStartStr ? new Date(trialStartStr) : new Date();
      
      const trialDaysLeft = this.calculateTrialDaysLeft(trialStartedAt);
      const isTrialActive = !isSubscribed && trialDaysLeft > 0;

      const status: SubscriptionStatus = {
        isSubscribed,
        isTrialActive,
        trialDaysLeft,
        subscriptionEndsAt,
        trialStartedAt,
        productId: purchaseInfo?.productId || null,
        purchaseToken: purchaseInfo?.purchaseToken || null,
      };

      this.cachedStatus = status;
      
      // Notify listeners
      this.statusListeners.forEach(listener => listener(status));

      return status;
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
      // Fallback to trial only
      const trialStartStr = await AsyncStorage.getItem('trialStart_' + userId);
      const trialStartedAt = trialStartStr ? new Date(trialStartStr) : new Date();
      const trialDaysLeft = this.calculateTrialDaysLeft(trialStartedAt);
      
      const status: SubscriptionStatus = {
        isSubscribed: false,
        isTrialActive: trialDaysLeft > 0,
        trialDaysLeft,
        subscriptionEndsAt: null,
        trialStartedAt,
        productId: null,
        purchaseToken: null,
      };
      
      this.cachedStatus = status;
      this.statusListeners.forEach(listener => listener(status));
      
      return status;
    }
  }

  /**
   * Calculate remaining trial days
   */
  private calculateTrialDaysLeft(trialStart: Date): number {
    const TRIAL_DAYS = 3;
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, TRIAL_DAYS - elapsed);
  }

  /**
   * Check if user can access premium features (Analytics)
   */
  canAccessPremium(userId: string): boolean {
    if (!this.cachedStatus) return false;
    return this.cachedStatus.isSubscribed || this.cachedStatus.isTrialActive;
  }

  /**
   * Get current status (cached)
   */
  getCurrentStatus(): SubscriptionStatus | null {
    return this.cachedStatus;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: SubscriptionStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Save subscription status to local storage
   */
  private async saveSubscriptionStatus(isSubscribed: boolean): Promise<void> {
    await AsyncStorage.setItem('isSubscribed', isSubscribed.toString());
  }

  /**
   * Check subscription expiration and show upgrade prompt if expired
   */
  async checkAndHandleExpiration(userId: string): Promise<boolean> {
    const status = await this.refreshStatus(userId);
    
    if (!status.isSubscribed && !status.isTrialActive) {
      // Subscription expired - show upgrade prompt
      return false;
    }
    
    return true;
  }
}

export const subscriptionService = SubscriptionService.getInstance();