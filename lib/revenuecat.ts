// lib/revenuecat.ts
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { supabase } from '@/lib/supabase';

// Make sure this matches your RevenueCat dashboard
export const ENTITLEMENT_ID = 'Sankalp Pro'; // Consistent capitalization

export function initRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

  if (Platform.OS === 'ios') {
    if (!iosApiKey) {
      console.warn('RevenueCat: EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set');
      return;
    }
    Purchases.configure({ apiKey: iosApiKey });
  } else {
    if (!androidApiKey) {
      console.warn('RevenueCat: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is not set');
      return;
    }
    Purchases.configure({ apiKey: androidApiKey });
  }
}

export async function checkEntitlement(entitlementId: string): Promise<boolean> {
  try {
    // Force a fresh fetch from RevenueCat servers (not cached).
    // This ensures expiry/cancellation is reflected immediately on app open.
    const customerInfo = await Purchases.invalidateCustomerInfoCache().then(
      () => Purchases.getCustomerInfo()
    );
    const hasActive = !!customerInfo?.entitlements?.active?.[entitlementId];
    console.log(`🔍 Checking entitlement ${entitlementId}: ${hasActive}`);
    return hasActive;
  } catch (e) {
    console.warn('RevenueCat: failed to fetch customer info', e);
    return false;
  }
}

export async function getDatabaseSubscriptionStatus(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    await supabase
      .from('subscriptions')
      .update({ status: 'inactive' })
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('expiration_date', new Date().toISOString());

    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, expiration_date, purchase_date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Database subscription check failed:', error);
      return false;
    }

    if (!data) return false;

    if (data.status === 'active') return true;

    if (data.expiration_date) {
      return new Date(data.expiration_date) > new Date();
    }

    return false;
  } catch (e) {
    console.warn('Database subscription check failed:', e);
    return false;
  }
}

export async function syncActiveSubscriptionToDatabase(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];

    if (!customerInfo || !entitlement) {
      return false;
    }

    const { data: latestRow, error: latestRowError } = await supabase
      .from('subscriptions')
      .select('id, status, expiration_date, purchase_token, product_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRowError) {
      console.warn('Failed to inspect latest subscription row:', latestRowError);
    }

    if (
      latestRow?.status === 'active' &&
      latestRow?.expiration_date &&
      new Date(latestRow.expiration_date) > new Date() &&
      latestRow?.product_id === (entitlement.productIdentifier || 'unknown')
    ) {
      console.log('✅ Latest subscription row already active; skipping duplicate insert');
      return true;
    }

    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      product_id: entitlement.productIdentifier || 'unknown',
      purchase_token: customerInfo.originalAppUserId || 'revenuecat_user',
      purchase_date: entitlement.latestPurchaseDate || now,
      expiration_date: entitlement.expirationDate || null,
      auto_renewing: entitlement.willRenew ?? true,
      status: 'active',
      updated_at: now,
    };

    const { error } = await supabase.from('subscriptions').insert(payload);

    if (!error) {
      console.log('✅ Subscription inserted into Supabase with status=active');
      return true;
    }

    console.error('Error saving subscription to Supabase:', error);
    return false;
  } catch (e) {
    console.warn('Failed to sync subscription to database:', e);
    return false;
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    console.log('📦 Offerings loaded:', offerings.current?.availablePackages?.map(p => p.product.identifier));
    return offerings;
  } catch (e) {
    console.warn('RevenueCat: failed to get offerings', e);
    return null;
  }
}

export async function purchasePackage(): Promise<boolean> {
  try {
    const offerings = await getOfferings();
    const pkg = offerings?.current?.availablePackages?.find(
      p => p.product.identifier === '3_months_plan:quarterly'
    );
    
    if (!pkg) {
      console.error('3_months_plan:quarterly package not found');
      return false;
    }
    
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  } catch (e: any) {
    if (!e.userCancelled) console.error('Purchase error:', e);
    return false;
  }
}

export async function presentPaywall(): Promise<boolean> {
  try {
    const result = await RevenueCatUI.presentPaywall();
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        return true;
      default:
        return false;
    }
  } catch (e) {
    console.warn('RevenueCat: paywall error', e);
    return false;
  }
}

export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('RevenueCat: failed to get customer info', e);
    return null;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  } catch (e) {
    console.warn('RevenueCat: restore failed', e);
    return false;
  }
}