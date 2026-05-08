// store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  user_metadata?: any;
  hasCompleteProfile?: boolean;
}

interface Session {
  access_token: string;
  refresh_token: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isNewSignup: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  setIsNewSignup: (val: boolean) => void;
  updateProfileStatus: (hasCompleteProfile: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      isNewSignup: false,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setIsNewSignup: (val) => set({ isNewSignup: val }),
      updateProfileStatus: (hasCompleteProfile) =>
        set((state) => ({
          user: state.user ? { ...state.user, hasCompleteProfile } : null,
        })),
      clearAuth: () => {
        console.log('🧹 Clearing all auth state');
        set({ user: null, session: null, isLoading: false, isNewSignup: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // isNewSignup is intentionally NOT persisted — resets on app restart
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);