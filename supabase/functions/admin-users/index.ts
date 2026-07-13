// Supabase Edge Function: admin-users
// Creates / updates / deletes user accounts, and handles password lifecycle.
//
// Auth-user creation needs the service_role key (Admin API), which must never
// reach the browser. This function runs server-side, verifies the caller's
// JWT, then performs the privileged operation. The frontend calls it via
// supabase.functions.invoke('admin-users', { body }).
//
// Actions:
//   create             (Super Admin) — makes a user with a random temp
//                       password; returns it so the admin can hand it over.
//                       The user must change it on first login.
//   update             (Super Admin) — edits name/role/modules (no password).
//   resetPassword      (Super Admin) — issues a fresh random temp password
//                       and forces another first-login change; returns it.
//   delete             (Super Admin) — removes the auth user + profile.
//   changeOwnPassword  (any signed-in user) — sets the caller's own password,
//                       clears the "must change" flag, and records the new
//                       password in readable form (Super-Admin-visible).
//
// Deploy:  supabase functions deploy admin-users
// Secret:  supabase secrets set AUTH_EMAIL_DOMAIN=catering-berkah.local
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
//  automatically by the platform. JWT verification stays ON.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// Human-friendly random password: 10 chars, no ambiguous 0/O/1/I/l.
function genTempPassword(len = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const arr = new Uint32Array(len)
  crypto.getRandomValues(arr)
  let out = ''
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length]
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const domain = Deno.env.get('AUTH_EMAIL_DOMAIN') ?? 'catering-berkah.local'
  const emailFor = (u: string) => `${u.trim().toLowerCase()}@${domain}`

  // Identify the caller from their JWT.
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
  } = await caller.auth.getUser()
  if (!user) return json(401, { error: 'Tidak terautentikasi.' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Body tidak valid.' })
  }
  const action = body.action as string

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  try {
    // -----------------------------------------------------------------
    // Any signed-in user may change THEIR OWN password (first-login flow).
    // -----------------------------------------------------------------
    if (action === 'changeOwnPassword') {
      const { password } = body as { password: string }
      if (!password || password.length < 6) {
        return json(400, { error: 'Password minimal 6 karakter.' })
      }
      const { error } = await admin.auth.admin.updateUserById(user.id, { password })
      if (error) return json(400, { error: error.message })
      const { error: pErr } = await admin
        .from('profiles')
        .update({ must_change_password: false, visible_password: password })
        .eq('id', user.id)
      if (pErr) return json(400, { error: pErr.message })
      return json(200, { ok: true })
    }

    // -----------------------------------------------------------------
    // Everything below is Super-Admin-only.
    // -----------------------------------------------------------------
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'Super Admin') {
      return json(403, { error: 'Hanya Super Admin yang boleh mengelola pengguna.' })
    }

    if (action === 'create') {
      const { username, full_name, role, modules } = body as {
        username: string; full_name: string; role: string; modules: string[]
      }
      if (!username || !full_name) return json(400, { error: 'Nama dan ID wajib diisi.' })

      const tempPassword = genTempPassword()

      const { data: created, error } = await admin.auth.admin.createUser({
        email: emailFor(username),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { username, full_name },
      })
      if (error) return json(400, { error: error.message })

      const { error: pErr } = await admin.from('profiles').insert({
        id: created.user.id,
        username: username.trim().toLowerCase(),
        full_name,
        role,
        modules: modules ?? [],
        is_active: true,
        must_change_password: true,
        visible_password: tempPassword,
      })
      if (pErr) {
        // Roll back the auth user so we don't leave an orphan.
        await admin.auth.admin.deleteUser(created.user.id)
        return json(400, { error: pErr.message })
      }
      return json(200, { ok: true, id: created.user.id, tempPassword })
    }

    if (action === 'update') {
      const { id, username, full_name, role, modules } = body as {
        id: string; username: string; full_name: string; role: string; modules: string[]
      }
      if (!id) return json(400, { error: 'ID pengguna wajib.' })

      // Keep the auth email in sync with the username.
      const { error: uErr } = await admin.auth.admin.updateUserById(id, {
        email: emailFor(username),
        user_metadata: { username, full_name },
      })
      if (uErr) return json(400, { error: uErr.message })

      const { error: pErr } = await admin
        .from('profiles')
        .update({ username: username.trim().toLowerCase(), full_name, role, modules: modules ?? [] })
        .eq('id', id)
      if (pErr) return json(400, { error: pErr.message })
      return json(200, { ok: true })
    }

    if (action === 'resetPassword') {
      const { id } = body as { id: string }
      if (!id) return json(400, { error: 'ID pengguna wajib.' })
      const tempPassword = genTempPassword()
      const { error } = await admin.auth.admin.updateUserById(id, { password: tempPassword })
      if (error) return json(400, { error: error.message })
      const { error: pErr } = await admin
        .from('profiles')
        .update({ must_change_password: true, visible_password: tempPassword })
        .eq('id', id)
      if (pErr) return json(400, { error: pErr.message })
      return json(200, { ok: true, tempPassword })
    }

    if (action === 'delete') {
      const { id } = body as { id: string }
      if (!id) return json(400, { error: 'ID pengguna wajib.' })
      if (id === user.id) return json(400, { error: 'Tidak bisa menghapus akun sendiri.' })
      // profiles.id references auth.users on delete cascade, so this removes both.
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) return json(400, { error: error.message })
      return json(200, { ok: true })
    }

    return json(400, { error: 'Aksi tidak dikenali.' })
  } catch (e) {
    return json(500, { error: (e as Error).message })
  }
})
