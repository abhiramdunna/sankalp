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

/**
 * FIX 1: Added logoutRevenueCat()
 *
 * This MUST be called before logging in a new user with Purchases.logIn().
 * Without this, RevenueCat keeps the previous user's session on the device,
 * so when a second Google account tries to subscribe, RevenueCat sees the
 * device-level purchase from the first account and says "already active".
 *
 * Call this:
 *   - On app logout (alongside supabase.auth.signOut())
 *   - In signInWithGoogle() BEFORE loginRevenueCat(userId) — handled in auth.ts
 */
export async function logoutRevenueCat(): Promise<void> {
  try {
    // Purchases.logOut() resets to anonymous ID, clearing the previous
    // user's entitlements from the SDK session on this device.
    await Purchases.logOut();
    console.log('💰 RevenueCat logged out — session reset to anonymous');
  } catch (e) {
    // logOut() throws if the SDK is already anonymous (no user logged in).
    // This is safe to ignore — we just want to guarantee a clean state.
    console.warn('⚠️ RevenueCat logOut failed (non-blocking):', e);
  }
}

export async function getDatabaseSubscriptionStatus(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    // Mark any rows that have passed their expiration date as inactive
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

/**
 * FIX 2: Replaced insert() with update-or-insert pattern.
 *
 * Previously, every call to this function inserted a NEW row, causing
 * duplicate rows piling up in the subscriptions table for the same user.
 *
 * Now:
 *   - If a row already exists for this user → UPDATE it in place
 *   - If no row exists yet → INSERT the first row
 *
 * This keeps exactly ONE subscription row per user at all times,
 * making the table clean and easy to read.
 */
export async function syncActiveSubscriptionToDatabase(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];

    if (!customerInfo || !entitlement) {
      return false;
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

    // Check if any row already exists for this user
    const { data: existingRow, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.warn('Failed to check existing subscription row:', fetchError);
    }

    if (existingRow?.id) {
      // ── Row exists → UPDATE it in place (no duplicate rows) ──────────────
      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', existingRow.id);

      if (!error) {
        console.log('✅ Subscription row updated in Supabase');
        return true;
      }

      console.error('Error updating subscription in Supabase:', error);
      return false;
    } else {
      // ── No row yet → INSERT the first one ────────────────────────────────
      const { error } = await supabase.from('subscriptions').insert(payload);

      if (!error) {
        console.log('✅ Subscription row inserted into Supabase');
        return true;
      }

      console.error('Error inserting subscription in Supabase:', error);
      return false;
    }
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

/**
 * FIX 3: Handle ITEM_ALREADY_OWNED inside presentPaywall.
 *
 * When a user tries to purchase a product that is already owned by the
 * Google Play account on the device (e.g. they subscribed on account A,
 * then switched app login to account B), Google Play throws ITEM_ALREADY_OWNED.
 *
 * This is NOT a real error — the purchase exists. We just need to restore it
 * so RevenueCat links it to the current logged-in user.
 *
 * restorePurchases() tells Google Play "acknowledge this existing purchase"
 * and RevenueCat will grant the entitlement to whoever is currently
 * logged in via Purchases.logIn(userId).
 */
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
  } catch (e: any) {
    // ITEM_ALREADY_OWNED means Google Play has this purchase on the device.
    // Auto-restore it instead of showing a confusing error to the user.
    const isAlreadyOwned =
      e?.code === 'ProductAlreadyPurchasedError' ||
      e?.message?.includes('already active') ||
      e?.message?.includes('already owned') ||
      e?.underlyingErrorMessage?.includes('ITEM_ALREADY_OWNED');

    if (isAlreadyOwned) {
      console.log('🔄 ITEM_ALREADY_OWNED detected — auto-restoring purchase...');
      try {
        const restored = await restorePurchases();
        console.log('✅ Auto-restore result:', restored);
        return restored;
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