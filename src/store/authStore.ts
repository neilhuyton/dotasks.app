// src/store/authStore.ts
import { create } from 'zustand';

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  accessToken: string | null;     // short-lived JWT — in memory only
  refreshToken: string | null;    // long-lived, rotated — persisted
  login: (userId: string, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

const STORAGE_KEYS = {
  userId: 'userId',
  refreshToken: 'refreshToken',
} as const;

const initializeState = (): Omit<AuthState, 'login' | 'setAccessToken' | 'logout'> => {
  const storedUserId = localStorage.getItem(STORAGE_KEYS.userId);
  const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

  return {
    isLoggedIn: !!storedRefreshToken,
    userId: storedUserId || null,
    accessToken: null,              // never restore from storage
    refreshToken: storedRefreshToken || null,
  };
};

export const useAuthStore = create<AuthState>()((set) => ({
  ...initializeState(),

  login: (userId: string, accessToken: string, refreshToken: string) => {
    set({
      isLoggedIn: true,
      userId,
      accessToken,
      refreshToken,
    });

    localStorage.setItem(STORAGE_KEYS.userId, userId);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  },

  setAccessToken: (accessToken: string) => {
    set({ accessToken });
  },

  logout: () => {
    set({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });

    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  },
}));