import { supabase } from './supabase';

export type AuthMode = 'signup' | 'login';

export async function signInWithGoogleIdToken(idToken: string, mode: AuthMode) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  return data;
}