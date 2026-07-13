#!/usr/bin/env node
/**
 * Provision the initial user accounts (real Supabase Auth users + profiles).
 *
 * Login uses "ID Pengguna" (username). We map username -> username@<domain>
 * as the Auth email so the real password lives in auth.users. This mirrors
 * the prototype accounts but with real, hashed credentials.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   AUTH_EMAIL_DOMAIN=catering-berkah.local \
 *   node scripts/seed-users.mjs
 *
 * The service role key is required (admin API) and must NEVER ship to the
 * browser. Run this from a trusted machine / CI secret, not the frontend.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const domain = process.env.AUTH_EMAIL_DOMAIN || 'catering-berkah.local'

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Seed accounts. Change the passwords before running in production.
const USERS = [
  { username: 'dony',   full_name: 'Dony Renato', role: 'Super Admin', password: 'cateringberkah1121', modules: [] },
  { username: 'hamada', full_name: 'Hamada',      role: 'Admin',       password: 'berkah2026',          modules: ['master', 'gaji'] },
  { username: 'fahmi',  full_name: 'Fahmi Jufry', role: 'Admin',       password: 'berkah2026',          modules: ['master', 'gaji'] },
]

const emailFor = (username) => `${username.toLowerCase()}@${domain}`

for (const u of USERS) {
  const email = emailFor(u.username)

  // Create (or find) the auth user.
  let userId
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: u.password,
    email_confirm: true,
    user_metadata: { username: u.username, full_name: u.full_name },
  })

  if (createErr) {
    if (/registered|exists/i.test(createErr.message)) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const found = list?.users?.find((x) => x.email === email)
      if (!found) {
        console.error(`✗ ${u.username}: exists but could not be located`, createErr.message)
        continue
      }
      userId = found.id
      await admin.auth.admin.updateUserById(userId, { password: u.password })
    } else {
      console.error(`✗ ${u.username}:`, createErr.message)
      continue
    }
  } else {
    userId = created.user.id
  }

  // Upsert the profile row (role + module permissions).
  const { error: profErr } = await admin.from('profiles').upsert(
    {
      id: userId,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      modules: u.modules,
      is_active: true,
    },
    { onConflict: 'id' },
  )

  if (profErr) console.error(`✗ ${u.username} profile:`, profErr.message)
  else console.log(`✓ ${u.username} (${u.role}) -> ${email}`)
}

console.log('Done.')
