// src/lib/supabase-utils.ts

import { supabase } from "./supabase";
import type { SignUpWithPasswordCredentials } from "@supabase/supabase-js";

export async function safeGetSession() {
  return supabase.auth.getSession();
}

export async function safeRefreshSession() {
  return supabase.auth.refreshSession();
}

export async function safeSignInWithPassword(
  credentials: { email: string; password: string }
) {
  return supabase.auth.signInWithPassword(credentials);
}

export async function safeSignUp(
  credentials: SignUpWithPasswordCredentials
) {
  return supabase.auth.signUp(credentials);
}