// Supabase Edge Function: admin-users
// Creates / updates / deletes user accounts on behalf of a Super Admin.
//
// Auth-user creation needs the service_role key (Admin API), which must never
// reach the browser. This function runs server-side, verifies the caller is a
// Super Admin, then performs the privileged operation. The frontend calls it
// via supabase.functions.invoke('admin-users', { body }).
//
// Deploy:  supabase functions deploy admin-users
// Secret:  supabase secrets set AUTH_EMAIL_DOMAIN=catering-berkah.local
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
//  automatically by the platform. JWT verification stays ON — the caller's
//  access token is passed by supabase.functions.invoke and re-checked here.)

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

  // Service-role client + Super Admin gate.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'Super Admin') return json(403, { error: 'Hanya Super Admin yang boleh mengelola pengguna.' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Body tidak valid.' })
  }
  const action = body.action as string

  try {
    if (action === 'create') {
      const { username, full_name, password, role, modules } = body as {
        username: string; full_name: string; password: string; role: string; modules: string[]
      }
      if (!username || !password || !full_name) return json(400, { error: 'Nama, ID, dan Password wajib diisi.' })

      const { data: created, error } = await admin.auth.admin.createUser({
        email: emailFor(username),
        password,
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
      })
      if (pErr) {
        // Roll back the auth user so we don't leave an orphan.
        await admin.auth.admin.deleteUser(created.user.id)
        return json(400, { error: pErr.message })
      }
      return json(200, { ok: true, id: created.user.id })
    }

    if (action === 'update') {
      const { id, username, full_name, password, role, modules } = body as {
        id: string; username: string; full_name: string; password?: string; role: string; modules: string[]
      }
      if (!id) return json(400, { error: 'ID pengguna wajib.' })

      if (password) {
        const { error } = await admin.auth.admin.updateUserById(id, {
          password,
          email: emailFor(username),
          user_metadata: { username, full_name },
        })
        if (error) return json(400, { error: error.message })
      }
      const { error: pErr } = await admin
        .from('profiles')
        .update({ username: username.trim().toLowerCase(), full_name, role, modules: modules ?? [] })
        .eq('id', id)
      if (pErr) return json(400, { error: pErr.message })
      return json(200, { ok: true })
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
