// store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeId, AppTheme, THEMES, DEFAULT_THEME_ID, DEFAULT_THEME } from '@/constants/theme';

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

interface ThemeState {
  themeId: ThemeId;
  theme: AppTheme;
  setTheme: (id: ThemeId) => void;
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
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME_ID,
      theme: DEFAULT_THEME,
      setTheme: (id: ThemeId) =>
        set({ themeId: id, theme: THEMES[id] }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ themeId: state.themeId }),
      // Re-hydrate the full theme object from the stored themeId on startup
      onRehydrateStorage: () => (state) => {
        if (state && state.themeId) {
          state.theme = THEMES[state.themeId] ?? DEFAULT_THEME;
        }
      },
    }
  )
);