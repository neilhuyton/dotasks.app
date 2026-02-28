// src/shared/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const isTest = import.meta.env.MODE === "test";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !isTest,
    storage: isTest ? undefined : localStorage,
  },
  realtime: isTest ? undefined : { params: { eventsPerSecond: 0 } },
});
