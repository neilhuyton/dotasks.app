// src/store/bannerStore.ts

import { create } from "zustand";

type Banner = {
  message: string;
  variant?: "success" | "error" | "info";
  duration?: number;
} | null;

export const useBannerStore = create<{
  banner: Banner;
  show: (banner: Banner) => void;
  hide: () => void;
}>((set) => ({
  banner: null,
  show: (banner) => set({ banner }),
  hide: () => set({ banner: null }),
}));
