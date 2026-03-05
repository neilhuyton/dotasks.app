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
<<<<<<< HEAD
      flowType: 'pkce'
=======
      flowType: 'pkce',
>>>>>>> main
    }
  })
}

export const supabase = supabaseInstance