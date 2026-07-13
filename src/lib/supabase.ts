import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Single shared browser client. The anon key is safe to expose; RLS on the
// database is what actually enforces access.
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
