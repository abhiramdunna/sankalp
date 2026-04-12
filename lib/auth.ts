import { supabase } from './supabase';

export type AuthMode = 'signup' | 'login';

export async function signInWithGoogleIdToken(idToken: string, mode: AuthMode) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  
  // Check if user already exists on signup attempt
  if (mode === 'signup' && data?.user?.id) {
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existingProfile) {
      // User already exists - throw custom error
      throw new Error('USER_ALREADY_EXISTS');
    }
  }
  
  return data;
}