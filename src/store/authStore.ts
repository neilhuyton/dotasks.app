// src/store/authStore.ts
import { create } from 'zustand';

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  accessToken: string | null;      // short-lived JWT — never persisted
  refreshToken: string | null;     // long-lived, rotated — persisted
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
      console.warn('[authStore] login called with missing values');
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

    console.debug('[authStore] User logged in – tokens stored');
  },

  setAccessToken: (accessToken: string) => {
    if (!accessToken) {
      console.warn('[authStore] setAccessToken called with empty value');
      return;
    }
    set({ accessToken });
    console.debug('[authStore] Access token updated');
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

    console.debug('[authStore] User logged out – storage cleared');
  },
}));

// Optional: helper to get current state outside of components (e.g. in trpc links)
export const getAuthState = () => useAuthStore.getState();

export const resetAuthStore = () => {
  useAuthStore.setState({
    isLoggedIn: false,
    userId: null,
    accessToken: null,
    refreshToken: null,
  });

  // Also clear storage to match real logout behavior
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  }

  console.debug('[authStore] Auth fully reset (for testing)');
};