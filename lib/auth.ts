import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

export type AuthMode = 'signup' | 'login';

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    // ⚠️ IMPORTANT: Use the WEB CLIENT ID from Google Cloud Console
    // NOT the Android client ID from google-services.json
    webClientId: "91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com",
    offlineAccess: true,
    scopes: ['profile', 'email'],
  });
}

export async function signInWithGoogle(mode: AuthMode) {
  try {
    await GoogleSignin.hasPlayServices();
    
    const response = await GoogleSignin.signIn();
    
    if (!isSuccessResponse(response)) {
      throw new Error('CANCELLED');
    }
    
    const idToken = response.data?.idToken;
    
    if (!idToken) {
      throw new Error('No ID token received from Google');
    }
    
    console.log('✅ ID Token received, length:', idToken.length);
    
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    
    if (error) {
      console.error('❌ Supabase Auth Error:', {
        message: error.message,
        status: error.status,
        fullError: error,
      });
      throw new Error(`Authentication failed: ${error.message}`);
    }
    
    if (!data?.session) {
      console.warn('⚠️ No session in response, but auth state changed - this is OK on native');
    }
    
    if (!data?.user) {
      throw new Error('No user returned from Supabase after auth.');
    }
    
    console.log('✅ User authenticated:', data.user.email);
    
    // ✅ FIX: On native, Supabase keeps session in memory even if getSession() returns null
    // The auth state listener confirms SIGNED_IN, so we're authenticated
    // Just wait a bit for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Authentication complete, ready to proceed');
    
    // On signup, check if user already existed
    if (mode === 'signup' && data?.user?.id) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (existingProfile) {
        throw new Error('USER_ALREADY_EXISTS');
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ signInWithGoogle error:', error);
    throw error;
  }
}

// Keep this for web OAuth flow
export async function signInWithGoogleIdToken(idToken: string, mode: AuthMode) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  
  if (error) throw error;
  
  if (mode === 'signup' && data?.user?.id) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();
    
    if (existingProfile) {
      throw new Error('USER_ALREADY_EXISTS');
    }
  }
  
  return data;
}