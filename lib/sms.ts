// lib/sms.ts
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';

const { SmsModule } = NativeModules;
const DEFAULT_COUNTRY_CODE = '+91';

export interface BillSMSData {
  customerName: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  businessName: string;
  date: string;
  paymentMode?: 'cash' | 'upi';
}

export function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim().replace(/[\s-]/g, '');

  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  if (trimmed.startsWith('91') && trimmed.length === 12) {
    return `+${trimmed}`;
  }

  if (trimmed.startsWith('0') && trimmed.length === 11) {
    return `${DEFAULT_COUNTRY_CODE}${trimmed.slice(1)}`;
  }

  if (/^[6-9]\d{9}$/.test(trimmed)) {
    return `${DEFAULT_COUNTRY_CODE}${trimmed}`;
  }

  return trimmed;
}

/**
 * Request SEND_SMS permission (Android only, shown once to user)
 */
export async function requestSMSPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false; // iOS silent SMS not allowed
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'SMS Permission',
        message: 'Sankalp needs SMS permission to send bills to your customers',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.warn('SMS permission error:', e);
    return false;
  }
}

/**
 * Format bill into a compact SMS message
 */
export function formatBillSMS(data: BillSMSData): string {
  const itemLines = data.items
    .map(item => `${item.name} x${item.qty} = Rs.${item.price * item.qty}`)
    .join('\n');

  return (
    `Bill from ${data.businessName}\n` +
    `Date: ${data.date}\n` +
    `Customer: ${data.customerName}\n` +
    `---\n` +
    `${itemLines}\n` +
    `---\n` +
    `Total: Rs.${data.total}\n` +
    `Payment: ${data.paymentMode === 'upi' ? 'UPI' : 'Cash'}\n` +
    `Thank you!`
  );
}

/**
 * Send bill SMS silently using the native SmsModule (background, no app opening).
 * Requires a proper dev/production build — NOT Expo Go.
 * iOS is not supported (silent SMS is not allowed on iOS).
 */
export async function sendBillSMS(data: BillSMSData): Promise<{
  success: boolean;
  error?: string;
}> {
  const phone = normalizePhoneNumber(data.phone);

  if (!phone) {
    return { success: false, error: 'No phone number' };
  }

  if (Platform.OS !== 'android') {
    // Silent background SMS is Android-only
    return { success: false, error: 'Silent SMS is only supported on Android' };
  }

  if (!SmsModule) {
    // Native module not available — running in Expo Go or module not linked
    console.warn('SmsModule not available. Run `npx expo run:android` for silent SMS.');
    return { success: false, error: 'Native SMS module not available. Use a production build.' };
  }

  try {
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
      return { success: false, error: 'SMS permission denied' };
    }

    const message = formatBillSMS(data);
    await SmsModule.sendSMS(phone, message);
    return { success: true };
  } catch (e: any) {
    console.error('SMS send failed:', e);
    return { success: false, error: e?.message || 'SMS failed' };
  }
}