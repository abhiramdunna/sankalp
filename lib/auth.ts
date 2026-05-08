// auth.ts
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

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
    .select('id, business_name, city')
    .eq('id', userId)
    .maybeSingle();

  // Log any errors for debugging (including RLS errors)
  if (error) {
    console.warn('⚠️ Profile query error:', error.message);
  }

  // No data = profile doesn't exist (whether due to error or not found)
  if (!data) {
    console.log('📋 No profile found for user:', userId);
    return { exists: false, isComplete: false };
  }

  return {
    exists: true,
    isComplete: !!(data.business_name && data.city),
  };
}

/**
 * LOGIN flow:
 *   1. Suppress SIGNED_IN event so _layout.tsx won't react yet
 *   2. Authenticate with Supabase (needs session to query profiles via RLS)
 *   3. Check profiles table
 *      → No profile row → signOut + throw NO_ACCOUNT_FOUND  (stays on login)
 *      → Profile exists → unsuppress + manually update store → go home
 *
 * SIGNUP flow:
 *   1. Suppress SIGNED_IN event
 *   2. Authenticate with Supabase
 *   3. Check profiles
 *      → Complete profile exists → signOut + throw ACCOUNT_EXISTS  (stays on login)
 *      → New/incomplete → upsert profile row + unsuppress → go to complete-profile
 */
export async function signInWithGoogle(mode: AuthMode): Promise<AuthResult> {
  const { idToken, userInfo } = await getGoogleCredential();
  console.log('📱 Got Google credential for:', userInfo.email);
  console.log('🔄 Auth mode:', mode);

  // Suppress the SIGNED_IN event that signInWithIdToken is about to fire
  setSuppressAuthEvent(true);
  console.log('🔒 Suppressing auth events');

  try {
    const { userId, user, session } = await authenticateWithSupabase(idToken);
    console.log('✅ Supabase auth done | uid:', userId);

    const { exists: profileExists, isComplete } = await getProfileCompleteness(userId);
    console.log('📋 Profile query result | exists:', profileExists, '| complete:', isComplete);

    // ── LOGIN ──────────────────────────────────────────────────────────────
    if (mode === 'login') {
      console.log('🔐 LOGIN MODE activated');
      // For login, we check if profile is COMPLETE, not just if it exists
      // A new account may have a profile row auto-created with nulls
      if (!isComplete) {
        console.log('❌ INCOMPLETE PROFILE → treating as new account, no login allowed');
        await supabase.auth.signOut();
        throw new Error('NO_ACCOUNT_FOUND');
      }
      // Valid login — profile exists and is complete
      console.log('✅ LOGIN MODE | Profile complete, unsuppressing auth event');
      setSuppressAuthEvent(false);
      return { user, session, isNewUser: false, hasCompleteProfile: true };
    }

    // ── SIGNUP ─────────────────────────────────────────────────────────────
    console.log('🆕 SIGNUP MODE activated');
    if (profileExists && isComplete) {
      console.log('⚠️  Profile exists and complete → throwing ACCOUNT_EXISTS error');
      await supabase.auth.signOut();
      throw new Error('ACCOUNT_EXISTS');
    }

    console.log('📝 Creating/updating profile row...');
    // New or resumed incomplete signup — create/update profile row
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: userId,
      email: user.email || userInfo.email,
    });

    if (upsertError) {
      console.error('❌ Upsert error:', upsertError);
      throw new Error('Failed to create profile: ' + upsertError.message);
    }

    console.log('✅ Profile upserted successfully, unsuppressing auth event');
    // Unsuppress so _layout.tsx reacts to the session and routes to complete-profile
    setSuppressAuthEvent(false);
    return { user, session, isNewUser: !profileExists, hasCompleteProfile: false };

  } catch (err) {
    console.error('💥 Error in signInWithGoogle:', err);
    // Always unsuppress on any error path so the listener isn't stuck
    setSuppressAuthEvent(false);
    throw err;
  }
}