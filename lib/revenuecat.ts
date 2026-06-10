// lib/revenuecat.ts
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { supabase } from '@/lib/supabase';

export const ENTITLEMENT_ID = 'Sankalp Pro';

// ── Ready gate ────────────────────────────────────────────────────────────────
// Resolves to true once RC is configured, false if init failed.
// Any caller that needs RC can await rcReady() instead of polling _revenueCatReady.
let _rcReadyResolve: (value: boolean) => void;
const _rcReadyPromise = new Promise<boolean>((resolve) => {
  _rcReadyResolve = resolve;
});

export async function rcReady(): Promise<boolean> {
  return _rcReadyPromise;
}

export async function initRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  try {
    console.log('💰 Initializing RevenueCat...');

    const { data, error } = await supabase.functions.invoke('revenuecat', {
      headers: { 'x-platform': Platform.OS },
    });

    if (error) {
      console.error('❌ RevenueCat edge function error:', error);
      _rcReadyResolve(false);
      return;
    }

    if (data?.error === 'REVENUECAT_KEY_NOT_CONFIGURED') {
      console.error('❌ RevenueCat key not configured in Supabase secrets');
      _rcReadyResolve(false);
      return;
    }

    if (!data?.key) {
      console.error('❌ No API key returned from edge function');
      _rcReadyResolve(false);
      return;
    }

    Purchases.configure({ apiKey: data.key });
    console.log('✅ RevenueCat initialized successfully');
    _rcReadyResolve(true);
  } catch (e: any) {
    console.error('❌ RevenueCat init failed:', e?.message || e);
    _rcReadyResolve(false);
  }
}

export function isRevenueCatReady(): boolean {
  // Kept for backwards compat — prefer awaiting rcReady() for async checks
  let resolved = false;
  _rcReadyPromise.then((v) => { resolved = v; });
  return resolved;
}

export async function checkEntitlement(entitlementId: string): Promise<boolean> {
  // Wait for RC to be configured before querying it
  const ready = await rcReady();
  if (!ready) {
    console.warn('RevenueCat not initialised — skipping entitlement check');
    return false;
  }

  try {
    const customerInfo = await Purchases.invalidateCustomerInfoCache().then(
      () => Purchases.getCustomerInfo()
    );
    const hasActive = !!customerInfo?.entitlements?.active?.[entitlementId];
    console.log(`🔍 Entitlement "${entitlementId}": ${hasActive}`);
    return hasActive;
  } catch (e) {
    console.warn('RevenueCat: failed to fetch customer info', e);
    return false;
  }
}

export async function logoutRevenueCat(): Promise<void> {
  const ready = await rcReady();
  if (!ready) {
    console.warn('⚠️ RevenueCat not initialised — skipping logout');
    return;
  }
  try {
    await Purchases.logOut();
    console.log('💰 RevenueCat logged out — session reset to anonymous');
  } catch (e) {
    console.warn('⚠️ RevenueCat logOut failed (non-blocking):', e);
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
    if (data.expiration_date) return new Date(data.expiration_date) > new Date();
    return false;
  } catch (e) {
    console.warn('Database subscription check failed:', e);
    return false;
  }
}

export async function syncActiveSubscriptionToDatabase(userId: string): Promise<boolean> {
  if (!userId) return false;

  const ready = await rcReady();
  if (!ready) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];

    if (!customerInfo || !entitlement) return false;

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

    const { data: existingRow, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) console.warn('Failed to check existing subscription row:', fetchError);

    if (existingRow?.id) {
      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', existingRow.id);
      if (!error) { console.log('✅ Subscription row updated in Supabase'); return true; }
      console.error('Error updating subscription in Supabase:', error);
      return false;
    } else {
      const { error } = await supabase.from('subscriptions').insert(payload);
      if (!error) { console.log('✅ Subscription row inserted into Supabase'); return true; }
      console.error('Error inserting subscription in Supabase:', error);
      return false;
    }
  } catch (e) {
    console.warn('Failed to sync subscription to database:', e);
    return false;
  }
}

export async function getOfferings() {
  const ready = await rcReady();
  if (!ready) return null;
  try {
    const offerings = await Purchases.getOfferings();
    console.log('📦 Offerings:', offerings.current?.availablePackages?.map(p => p.product.identifier));
    return offerings;
  } catch (e) {
    console.warn('RevenueCat: failed to get offerings', e);
    return null;
  }
}

export async function purchasePackage(): Promise<boolean> {
  const ready = await rcReady();
  if (!ready) return false;
  try {
    const offerings = await getOfferings();
    const pkg = offerings?.current?.availablePackages?.find(
      p => p.product.identifier === '3_months_plan:quarterly'
    );
    if (!pkg) { console.error('3_months_plan:quarterly package not found'); return false; }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  } catch (e: any) {
    if (!e.userCancelled) console.error('Purchase error:', e);
    return false;
  }
}

export async function presentPaywall(): Promise<boolean> {
  const ready = await rcReady();
  if (!ready) return false;
  try {
    const result = await RevenueCatUI.presentPaywall();
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        return true;
      default:
        return false;
    }
  } catch (e: any) {
    const isAlreadyOwned =
      e?.code === 'ProductAlreadyPurchasedError' ||
      e?.message?.includes('already active') ||
      e?.message?.includes('already owned') ||
      e?.underlyingErrorMessage?.includes('ITEM_ALREADY_OWNED');

    if (isAlreadyOwned) {
      console.log('🔄 ITEM_ALREADY_OWNED — auto-restoring...');
      try {
        return await restorePurchases();
      } catch (restoreError) {
        console.warn('RevenueCat: auto-restore failed', restoreError);
        return false;
      }
    }
    console.warn('RevenueCat: paywall error', e);
    return false;
  }
}

export async function getCustomerInfo() {
  const ready = await rcReady();
  if (!ready) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('RevenueCat: failed to get customer info', e);
    return null;
  }
}

export async function restorePurchases(): Promise<boolean> {
  const ready = await rcReady();
  if (!ready) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  } catch (e) {
    console.warn('RevenueCat: restore failed', e);
    return false;
  }
}