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
  user: "auth:user",
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
  const storedUserJson = localStorage.getItem(STORAGE_KEYS.user);

  let user: UserInfo | null = null;
  if (storedUserJson) {
    try {
      user = JSON.parse(storedUserJson) as UserInfo;
      // Basic validation
      if (!user.id || !user.email) {
        user = null;
      }
    } catch (err) {
      console.warn("[authStore] Failed to parse stored user:", err);
    }
  }

  const hasValidRefresh = !!refreshToken && refreshToken.trim() !== "";

  return {
    isLoggedIn: hasValidRefresh,
    userId: userId || null,
    user,
    accessToken: null,
    refreshToken: refreshToken || null,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  ...getInitialState(),

  login: (userId: string, email: string, accessToken: string, refreshToken: string) => {
    if (!userId?.trim() || !email?.trim() || !accessToken?.trim() || !refreshToken?.trim()) {
      console.warn("[authStore] Invalid login data - skipping");
      return;
    }

    const user: UserInfo = { id: userId, email };

    set({
      isLoggedIn: true,
      userId,
      user,
      accessToken,
      refreshToken,
    });

    localStorage.setItem(STORAGE_KEYS.userId, userId);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  },

  setAccessToken: (accessToken: string) => {
    if (!accessToken?.trim()) return;
    set({ accessToken });
  },

  updateUserEmail: (newEmail: string) => {
    if (!newEmail?.trim()) return;
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, email: newEmail };
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
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
    localStorage.removeItem(STORAGE_KEYS.user);

    queryClient.removeQueries();
  },
}));

export const getAuthState = () => useAuthStore.getState();