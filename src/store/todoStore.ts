// src/store/todoStore.ts

import { create } from 'zustand';

interface TodoState {
  activeListId: string | null;
  setActiveListId: (id: string | null) => void;
  initializeActiveList: (availableListIds: string[]) => void;
  reset: () => void;
}

export const useTodoStore = create<TodoState>()((set, get) => ({
  activeListId: null,

  setActiveListId: (id) => {
    console.debug('[todoStore] setActiveListId →', id);
    set({ activeListId: id });
  },

  initializeActiveList: (availableListIds: string[]) => {
    const current = get().activeListId;

    // Already have a valid active list → keep it
    if (current && availableListIds.includes(current)) {
      console.debug('[todoStore] initialize skipped — current is still valid');
      return;
    }

    if (availableListIds.length > 0) {
      console.debug('[todoStore] auto-selecting first list:', availableListIds[0]);
      set({ activeListId: availableListIds[0] });
    } else {
      console.debug('[todoStore] no lists available — activeListId stays null');
    }
  },

  reset: () => {
    set({ activeListId: null });
  },
}));