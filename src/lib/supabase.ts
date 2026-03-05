// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

let supabaseInstance: ReturnType<typeof createClient> | null = null

if (!supabaseInstance) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage,
      flowType: 'pkce',
      // Debug + prevent infinite lock waits (2025+ versions support this)
      debug: true // enables internal gotrue-js logs for lock/session
    }
  })
}

export const supabase = supabaseInstance

// Helper to manually check locks (run in console after hang)
export async function debugLocks() {
  if ('locks' in navigator) {
    const held = await navigator.locks.query()
    console.log('Current Web Locks:', held)
    return held
  }
  console.warn('navigator.locks not supported')
}