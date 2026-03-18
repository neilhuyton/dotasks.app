import { create } from "zustand";

type UIState = {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),
}));
