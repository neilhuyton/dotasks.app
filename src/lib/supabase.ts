// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or anon key");
}

const quietStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    const old = localStorage.getItem(key);
    if (old === value) return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => localStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: true,
    storage: quietStorage,
    storageKey: `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`,
    flowType: "implicit",
    lock: async <T>(
      _name: string,
      _acquireTimeout: number,
      fn: () => Promise<T>
    ): Promise<T> => fn(),
  },
});