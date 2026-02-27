// src/shared/store/authStore.ts

import { create } from "zustand";
import { queryClient } from "@/queryClient";

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
  userId: "auth:userId",
  refreshToken: "auth:refreshToken",
} as const;

function getInitialState(): Pick<
  AuthState,
  "isLoggedIn" | "userId" | "accessToken" | "refreshToken"
> {
  // SSR / server environment
  if (typeof window === "undefined") {
    return {
      isLoggedIn: false,
      userId: null,
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
    accessToken: null,
    refreshToken: refreshToken || null,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  ...getInitialState(),

  login: (userId: string, accessToken: string, refreshToken: string) => {
    if (!userId?.trim() || !accessToken?.trim() || !refreshToken?.trim()) {
      return;
    }

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
    if (!accessToken?.trim()) {
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

    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);

    // Prevent showing stale data from previous user
    queryClient.removeQueries();
    // Alternative (more aggressive): queryClient.clear();
  },
}));

// ────────────────────────────────────────────────
// Optional helpers (mainly useful in tests & utils)
// ────────────────────────────────────────────────

export const getAuthState = () => useAuthStore.getState();

// export const resetAuthStore = () => {
//   useAuthStore.setState({
//     isLoggedIn: false,
//     userId: null,
//     accessToken: null,
//     refreshToken: null,
//   });

//   if (typeof window !== "undefined") {
//     localStorage.removeItem(STORAGE_KEYS.userId);
//     localStorage.removeItem(STORAGE_KEYS.refreshToken);
//   }

//   queryClient.removeQueries();
// };
