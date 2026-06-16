// auth.ts
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import Purchases from 'react-native-purchases';
import { logoutRevenueCat } from './revenuecat';

export type AuthMode = 'signup' | 'login';

export type AuthResult = {
  user: any;
  session: any;
  isNewUser: boolean;
  hasCompleteProfile: boolean;
};

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: '91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com',
    offlineAccess: true,
    scopes: ['profile', 'email'],
  });
}

/**
 * This flag tells _layout.tsx to ignore the SIGNED_IN event fired by
 * supabase.auth.signInWithIdToken() while we are still running our
 * business-logic checks (profile existence, mode validation etc.).
 *
 * Without this, _layout.tsx reacts to SIGNED_IN immediately and navigates
 * to home before we have a chance to sign the user back out or redirect
 * them to complete-profile.
 */
export let suppressAuthEvent = false;
export function setSuppressAuthEvent(val: boolean) {
  suppressAuthEvent = val;
}

/**
 * Unsuppresses auth events only after the current microtask/event queue
 * has flushed. Supabase fires SIGNED_IN asynchronously; calling
 * setSuppressAuthEvent(false) synchronously can race with that delivery.
 * Awaiting this instead guarantees the event is consumed while still
 * suppressed before the listener becomes active again.
 */
export async function unsuppressAuthEvent(): Promise<void> {
  // One Promise tick is enough — Supabase's internal emitter uses
  // Promise-based delivery, so this flush ensures it has fired.
  await Promise.resolve();
  suppressAuthEvent = false;
}

export async function getGoogleCredential(): Promise<{
  idToken: string;
  userInfo: { email: string; name: string; photo: string | null };
}> {
  await GoogleSignin.hasPlayServices();
  try { await GoogleSignin.revokeAccess(); } catch (_) {}

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) throw new Error('CANCELLED');

  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('No ID token received from Google');

  return {
    idToken,
    userInfo: {
      email: response.data?.user?.email || '',
      name: response.data?.user?.name || '',
      photo: response.data?.user?.photo || null,
    },
  };
}

async function authenticateWithSupabase(
  idToken: string
): Promise<{ userId: string; user: any; session: any }> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw new Error(error.message);
  if (!data?.user) throw new Error('No user returned from Supabase after auth.');
  return { userId: data.user.id, user: data.user, session: data.session };
}

async function getProfileCompleteness(
  userId: string
): Promise<{ exists: boolean; isComplete: boolean }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, business_name, business_category, city, state, phone')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return { exists: false, isComplete: false };
  return {
    exists: true,
    isComplete: !!(
      data.business_name &&
      data.business_category &&
      data.city &&
      data.state &&
      data.phone
    ),
  };
}

/**
 * FIX: Always logout RevenueCat BEFORE logging in the new user.
 *
 * When a user switches Google accounts on the same device, the device
 * still has the previous account's RevenueCat session active. If we call
 * Purchases.logIn(newUserId) without logging out first, RevenueCat
 * transfers the device-level purchase to the new account, making the
 * paywall say "already active" even though the new user never purchased.
 *
 * logoutRevenueCat() resets the SDK to anonymous mode, then
 * Purchases.logIn(userId) starts a clean session for the new user.
 */
async function loginRevenueCat(userId: string): Promise<void> {
  try {
    // Step 1 — clear any previous user session from this device
    await logoutRevenueCat();

    // Step 2 — login with the real userId for this account
    const { customerInfo, created } = await Purchases.logIn(userId);
    console.log('💰 RevenueCat login success | new customer:', created);
  } catch (e) {
    console.warn('⚠️ RevenueCat logIn failed (non-blocking):', e);
  }
}

/**
 * LOGIN flow:
 *   1. Suppress SIGNED_IN event so _layout.tsx won't react yet
 *   2. Authenticate with Supabase (needs session to query profiles via RLS)
 *   3. Check profiles table
 *      → No profile row → signOut + throw NO_ACCOUNT_FOUND  (stays on login)
 *      → Profile exists → logout+login RevenueCat + unsuppress → go home
 *
 * SIGNUP flow:
 *   1. Suppress SIGNED_IN event
 *   2. Authenticate with Supabase
 *   3. Check profiles
 *      → Complete profile exists → signOut + throw ACCOUNT_EXISTS  (stays on login)
 *      → New/incomplete → upsert profile row + logout+login RevenueCat + unsuppress → go to complete-profile
 */
export async function signInWithGoogle(mode: AuthMode): Promise<AuthResult> {
  const { idToken, userInfo } = await getGoogleCredential();
  console.log('📱 Got Google credential for:', userInfo.email);

  // Suppress the SIGNED_IN event that signInWithIdToken is about to fire
  setSuppressAuthEvent(true);

  try {
    const { userId, user, session } = await authenticateWithSupabase(idToken);
    console.log('✅ Supabase auth done | uid:', userId);

    const { exists: profileExists, isComplete } = await getProfileCompleteness(userId);
    console.log('📋 Profile exists:', profileExists, '| complete:', isComplete);

    // ── LOGIN ──────────────────────────────────────────────────────────────
    if (mode === 'login') {
      if (!profileExists) {
        // Unsuppress BEFORE signing out so _layout.tsx can process SIGNED_OUT event.
        // Use unsuppressAuthEvent() so the already-queued SIGNED_IN is consumed
        // while still suppressed before we trigger SIGNED_OUT.
        await unsuppressAuthEvent();
        await supabase.auth.signOut();
        throw new Error('NO_ACCOUNT_FOUND');
      }
      // Logout previous RC session then login with this account's userId
      await loginRevenueCat(userId);
      // Yield to flush the Supabase SIGNED_IN delivery, THEN unsuppress.
      // _layout.tsx's listener will now see the event with suppressAuthEvent=false.
      await unsuppressAuthEvent();
      return { user, session, isNewUser: false, hasCompleteProfile: isComplete };
    }

    // ── SIGNUP ─────────────────────────────────────────────────────────────
    if (profileExists && isComplete) {
      await unsuppressAuthEvent();
      await supabase.auth.signOut();
      throw new Error('ACCOUNT_EXISTS');
    }

    // New or resumed incomplete signup — create/update profile row
    console.log('🔄 Upserting profile for user:', userId);
    const { data: upsertData, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: user.email || userInfo.email,
      })
      .select();

    if (upsertError) {
      console.error('❌ Profile upsert failed:', upsertError);
      throw new Error(`Profile save error: ${upsertError.message}`);
    }
    console.log('✅ Profile upserted successfully:', upsertData);

    // Logout previous RC session then login with this account's userId
    await loginRevenueCat(userId);

    // Flush the SIGNED_IN delivery, then unsuppress so _layout.tsx
    // routes the user to complete-profile.
    await unsuppressAuthEvent();
    return { user, session, isNewUser: !profileExists, hasCompleteProfile: false };

  } catch (err) {
    // Always unsuppress on any error path so the listener isn't stuck
    await unsuppressAuthEvent();
    throw err;
  }
}