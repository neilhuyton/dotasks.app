// src/shared/store/authStore.ts

import { create } from "zustand";
import { queryClient } from "@/queryClient";

export interface UserInfo {
  id: string;
  email: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (userId: string, email: string, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  updateUserEmail: (newEmail: string) => void;
  logout: () => void;
}

const STORAGE_KEYS = {
  userId: "auth:userId",
  refreshToken: "auth:refreshToken",
} as const;

function getInitialState(): Pick<
  AuthState,
  "isLoggedIn" | "userId" | "user" | "accessToken" | "refreshToken"
> {
  if (typeof window === "undefined") {
    return {
      isLoggedIn: false,
      userId: null,
      user: null,
      accessToken: null,
      refreshToken: null,
    };
  }

  const userId = localStorage.getItem(STORAGE_KEYS.userId);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

  const hasValidRefresh = !!refreshToken && refreshToken.trim() !== "";

  return {
    isLoggedIn: hasValidRefresh,
    userId: userId || null,
    user: null,               // email not persisted → loaded at login
    accessToken: null,
    refreshToken: refreshToken || null,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  ...getInitialState(),

  login: (userId: string, email: string, accessToken: string, refreshToken: string) => {
    if (!userId?.trim() || !email?.trim() || !accessToken?.trim() || !refreshToken?.trim()) {
      return;
    }

    set({
      isLoggedIn: true,
      userId,
      user: { id: userId, email },
      accessToken,
      refreshToken,
    });

    localStorage.setItem(STORAGE_KEYS.userId, userId);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  },

  setAccessToken: (accessToken: string) => {
    if (!accessToken?.trim()) {
      return;
    }
    set({ accessToken });
  },

  updateUserEmail: (newEmail: string) => {
    set((state) => ({
      user: state.user ? { ...state.user, email: newEmail } : null,
    }));
  },

  logout: () => {
    set({
      isLoggedIn: false,
      userId: null,
      user: null,
      accessToken: null,
      refreshToken: null,
    });

    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);

    // Prevent showing stale data from previous user
    queryClient.removeQueries();
  },
}));

// ────────────────────────────────────────────────
// Optional helpers (mainly useful in tests & utils)
// ────────────────────────────────────────────────

export const getAuthState = () => useAuthStore.getState();