import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export function initRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

  if (Platform.OS === 'ios') {
    if (!iosApiKey || iosApiKey === 'appl_xxxx_your_ios_api_key') {
      console.warn('⚠️ RevenueCat iOS API Key not configured in .env');
    }
    Purchases.configure({ apiKey: iosApiKey });
  } else {
    if (!androidApiKey || androidApiKey === 'goog_xxxx_your_android_api_key') {
      console.warn('⚠️ RevenueCat Android API Key not configured in .env');
    }
    Purchases.configure({ apiKey: androidApiKey });
  }
}

export async function checkEntitlement(entitlementId: string): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo?.entitlements?.active?.[entitlementId];
  } catch (e) {
    console.warn('RevenueCat: failed to fetch customer info', e);
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

// Add this helper to get customer info
export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('RevenueCat: failed to get customer info', e);
    return null;
  }
}