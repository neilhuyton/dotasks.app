// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";
import type {
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from "@supabase/supabase-js";

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
    autoRefreshToken: true,
    persistSession: true,
    storage: quietStorage,
    storageKey: `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`,
    flowType: "implicit",
  },
});

export const safeGetSession = () => supabase.auth.getSession();

export const safeRefreshSession = () => supabase.auth.refreshSession();

export const safeSignInWithPassword = (
  credentials: SignInWithPasswordCredentials,
) => supabase.auth.signInWithPassword(credentials);

export const safeSignUp = (credentials: SignUpWithPasswordCredentials) =>
  supabase.auth.signUp(credentials);
