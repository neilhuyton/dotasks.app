// src/store/authStore.ts

import { create } from 'zustand';
import { queryClient } from "../queryClient";

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  accessToken: string | null;     
  refreshToken: string | null;
  login: (userId: string, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

const STORAGE_KEYS = {
  userId: 'auth:userId',
  refreshToken: 'auth:refreshToken',
} as const;

// Helper to load initial state from localStorage (only on app start)
const getInitialState = (): Pick<
  AuthState,
  'isLoggedIn' | 'userId' | 'accessToken' | 'refreshToken'
> => {
  if (typeof window === 'undefined') {
    // SSR / server-side → no storage
    return {
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    };
  }

  const storedUserId = localStorage.getItem(STORAGE_KEYS.userId);
  const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

  const hasRefreshToken = !!storedRefreshToken && storedRefreshToken.trim() !== '';

  return {
    isLoggedIn: hasRefreshToken,
    userId: storedUserId || null,
    accessToken: null,           // never restore access token — always refresh it
    refreshToken: storedRefreshToken || null,
  };
};

export const useAuthStore = create<AuthState>()((set) => ({
  ...getInitialState(),

  login: (userId: string, accessToken: string, refreshToken: string) => {
    if (!userId || !accessToken || !refreshToken) {
      return;
    }

    set({
      isLoggedIn: true,
      userId,
      accessToken,
      refreshToken,
    });

    // Persist long-lived data
    localStorage.setItem(STORAGE_KEYS.userId, userId);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  },

  setAccessToken: (accessToken: string) => {
    if (!accessToken) {
      console.warn('[authStore] setAccessToken called with empty value');
      return;
    }
    set({ accessToken });
  },

  logout: () => {
    set({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });

    // Clear storage
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);

    // ─── MOST IMPORTANT CHANGE ──────────────────────────────────────
    // Remove all cached queries to prevent showing previous user's data
    queryClient.removeQueries();
    // Alternative (more aggressive): queryClient.clear();

    console.debug('[authStore] User logged out – storage & query cache cleared');
  },
}));

// Optional: helper to get current state outside of components
export const getAuthState = () => useAuthStore.getState();

export const resetAuthStore = () => {
  useAuthStore.setState({
    isLoggedIn: false,
    userId: null,
    accessToken: null,
    refreshToken: null,
  });

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  }

  // Also clear query cache during reset (useful for tests/dev)
  queryClient.removeQueries();

  console.debug('[authStore] Auth fully reset (for testing)');
};