// lib/whatsapp.ts
//
// Replaces sms.ts — sends bill notifications via WhatsApp instead of SMS.
//
// KEY DESIGN DECISION — why we use `https://wa.me/` instead of `whatsapp://send`:
//
//   whatsapp://send?phone=...  → Opens WhatsApp, creates a chat thread, and
//                                saves the number in WhatsApp's recent list.
//                                Sending bills to 50 customers = 50 unknown
//                                numbers filling your WhatsApp inbox forever.
//
//   https://wa.me/<phone>?text=... → Uses WhatsApp's "Click to Chat" flow.
//                                    WhatsApp opens a compose window pre-filled
//                                    with the message, but does NOT create a
//                                    persistent chat thread or save the contact
//                                    unless the customer actually replies.
//                                    This keeps your WhatsApp inbox clean. ✅
//
// FLOW:
//   1. You tap "Send Bill on WhatsApp" in the app.
//   2. WhatsApp opens with the bill pre-filled for the customer's number.
//   3. You tap Send once inside WhatsApp (one tap — message is already typed).
//   4. WhatsApp closes / you go back to the app.
//   5. Your WhatsApp inbox stays clean — no unknown contact saved.
//
// No native module or special permission needed. Works on both Android and iOS.
// Works in Expo Go too (no native build required).

import { Linking, Platform } from 'react-native';

const DEFAULT_COUNTRY_CODE = '+91';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BillWhatsAppData {
  customerName: string;
  phone: string;           // customer phone (recipient)
  businessPhone: string;   // your business phone (for validation only — WA sends from your logged-in account)
  items: { name: string; qty: number; price: number }[];
  total: number;
  businessName: string;
  date: string;
  paymentMode?: 'cash' | 'upi';
}

// ─── Phone Normalisation ─────────────────────────────────────────────────────

export function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim().replace(/[\s\-()]/g, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('91') && trimmed.length === 12) return `+${trimmed}`;
  if (trimmed.startsWith('0') && trimmed.length === 11)
    return `${DEFAULT_COUNTRY_CODE}${trimmed.slice(1)}`;
  if (/^[6-9]\d{9}$/.test(trimmed)) return `${DEFAULT_COUNTRY_CODE}${trimmed}`;
  return trimmed;
}

// Strip the leading '+' for the wa.me URL (wa.me needs digits only, no '+')
function toWaNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  return normalized.replace(/^\+/, '');
}

// ─── Message Formatter ───────────────────────────────────────────────────────

export function formatBillWhatsApp(data: BillWhatsAppData): string {
  const itemLines = data.items
    .map(
      (i) =>
        `• ${i.name} x${i.qty}  ₹${(i.price * i.qty).toLocaleString('en-IN')}`
    )
    .join('\n');

  const payment = data.paymentMode === 'upi' ? 'UPI' : 'Cash';

  return (
    `🧾 *Bill from ${data.businessName}*\n` +
    `📅 Date: ${data.date}\n` +
    `👤 To: ${data.customerName}\n` +
    `─────────────────\n` +
    `${itemLines}\n` +
    `─────────────────\n` +
    `💰 *Total: ₹${data.total.toLocaleString('en-IN')}*\n` +
    `💳 Payment: ${payment}\n\n` +
    `Thank you for your business! 🙏`
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateWhatsAppPrerequisites(
  data: BillWhatsAppData
): string | null {
  if (!data.phone || !data.phone.trim()) {
    return 'Customer phone number is missing.';
  }
  const custNorm = normalizePhoneNumber(data.phone);
  if (!custNorm || custNorm.length < 10) {
    return 'Customer phone number is invalid.';
  }
  return null; // all good
}

// ─── WhatsApp Availability Check ─────────────────────────────────────────────

export async function isWhatsAppInstalled(): Promise<boolean> {
  try {
    // Check the whatsapp:// scheme — available on both Android and iOS
    return await Linking.canOpenURL('whatsapp://send?text=test');
  } catch {
    return false;
  }
}

// ─── Main Send Function ───────────────────────────────────────────────────────

/**
 * Opens WhatsApp with the bill pre-filled for the customer.
 *
 * Uses the `https://wa.me/<number>?text=<message>` Click-to-Chat URL.
 * This is the ONLY method that avoids saving the customer as an unknown
 * contact in your WhatsApp inbox.
 *
 * The user taps Send once inside WhatsApp, then returns to the app.
 *
 * @returns { success: boolean; error?: string }
 */
export async function sendBillWhatsApp(data: BillWhatsAppData): Promise<{
  success: boolean;
  error?: string;
}> {
  // 1. Validate customer phone
  const prereqError = validateWhatsAppPrerequisites(data);
  if (prereqError) {
    return { success: false, error: prereqError };
  }

  // 2. Check WhatsApp is installed
  const installed = await isWhatsAppInstalled();
  if (!installed) {
    return {
      success: false,
      error:
        'WhatsApp is not installed on this device. Please install WhatsApp and try again.',
    };
  }

  // 3. Build the wa.me Click-to-Chat URL
  //    Format: https://wa.me/<countrycode><number>?text=<url-encoded-message>
  //    This does NOT open a persistent chat — it opens a compose window only.
  const waNumber = toWaNumber(data.phone);
  const message = formatBillWhatsApp(data);
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${waNumber}?text=${encodedMessage}`;

  // 4. Open WhatsApp
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      return {
        success: false,
        error: 'Unable to open WhatsApp. Please make sure it is installed.',
      };
    }

    await Linking.openURL(url);
    return { success: true };
  } catch (e: any) {
    console.error('WhatsApp open failed:', e);
    return {
      success: false,
      error: e?.message || 'Failed to open WhatsApp.',
    };
  }
}

// ─── Backwards-Compat Export ─────────────────────────────────────────────────
// Alias so any file that imported sendBillSMS keeps working with minimal changes.

/** @deprecated Use sendBillWhatsApp instead */
export const sendBillSMS = sendBillWhatsApp;
export type BillSMSData = BillWhatsAppData;