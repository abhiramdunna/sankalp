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

// PHASE 1: Get Google credential
export async function getGoogleCredential(): Promise<{
  idToken: string;
  userInfo: { email: string; name: string; photo: string | null };
}> {
  await GoogleSignin.hasPlayServices();

  try {
    await GoogleSignin.revokeAccess();
  } catch (_) {
    // ignore — revokeAccess fails if user was never signed in before
  }

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error('CANCELLED');
  }

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token received from Google');
  }

  return {
    idToken,
    userInfo: {
      email: response.data?.user?.email || '',
      name: response.data?.user?.name || '',
      photo: response.data?.user?.photo || null,
    },
  };
}

// PHASE 2: Check if user profile row exists by email
export async function checkUserExistsInDatabase(email: string): Promise<boolean> {
  if (!email) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error checking user existence:', error);
    return false;
  }

  return !!data;
}

/**
 * Main auth function.
 *
 * IMPORTANT: This function does NOT update the Zustand store.
 * The _layout.tsx onAuthStateChange listener handles store updates
 * automatically when Supabase fires SIGNED_IN.
 *
 * login.tsx should call this and only handle error states.
 * Navigation is handled entirely by _layout.tsx useProtectedRoute.
 */
export async function signInWithGoogle(mode: AuthMode): Promise<AuthResult> {
  // Phase 1: Google credential
  const { idToken, userInfo } = await getGoogleCredential();
  console.log('📱 Got Google credential for:', userInfo.email);

  // Phase 2: Mode-based existence check
  if (mode === 'login') {
    const exists = await checkUserExistsInDatabase(userInfo.email);
    if (!exists) throw new Error('NO_ACCOUNT_FOUND');
  }

  if (mode === 'signup') {
    const exists = await checkUserExistsInDatabase(userInfo.email);
    if (exists) throw new Error('ACCOUNT_EXISTS');
  }

  // Phase 3: Supabase authentication
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    console.error('❌ Supabase Auth Error:', error);
    throw new Error(error.message);
  }

  if (!data?.user) {
    throw new Error('No user returned from Supabase after auth.');
  }

  const userId = data.user.id;
  const userEmail = data.user.email || '';
  console.log('✅ Supabase auth success:', userEmail);

  // Phase 4: Profile handling
  if (mode === 'signup') {
    // Create profile row for brand new user (upsert is safe)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: userEmail,
    });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
    } else {
      console.log('✅ Profile row created');
    }

    return {
      user: data.user,
      session: data.session,
      isNewUser: true,
      hasCompleteProfile: false,
    };
  }

  // Login mode — check profile completeness
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, city')
    .eq('id', userId)
    .maybeSingle();

  const hasCompleteProfile = !!(profile?.business_name && profile?.city);

  return {
    user: data.user,
    session: data.session,
    isNewUser: false,
    hasCompleteProfile,
  };
}