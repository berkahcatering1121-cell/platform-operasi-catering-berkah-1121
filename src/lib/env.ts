// Centralised, validated access to build-time env.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surfaced early and clearly rather than as an opaque network error later.
  console.error(
    'Missing Supabase env. Copy .env.example to .env.local and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  authEmailDomain: import.meta.env.VITE_AUTH_EMAIL_DOMAIN ?? 'catering-berkah.local',
}

/** Map an ID Pengguna (username) to the synthetic Supabase Auth email. */
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${env.authEmailDomain}`
