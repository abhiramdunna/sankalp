import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
}

interface AuthStore {
  user: AuthUser | null;
  session: AuthSession | null;
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  setUser: (user) => {
    console.log('📦 Storing user in Zustand:', user?.email);
    set({ user });
  },
  setSession: (session) => {
    console.log('🔐 Storing session in Zustand');
    set({ session });
  },
  clearAuth: () => {
    console.log('🗑️ Clearing auth from Zustand');
    set({ user: null, session: null });
  },
}));
