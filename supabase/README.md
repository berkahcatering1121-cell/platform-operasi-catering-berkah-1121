# Database — Catering Berkah 1121

Postgres schema, Row Level Security, computed views, and the P&L roll-up for
the Platform Operasi app. Managed with the Supabase CLI.

## Migrations

| File | Contents |
| --- | --- |
| `migrations/0001_schema.sql` | All tables: roles, profiles, master data, menu + HPP recipe, and the transaction ledger (purchases, sales, payroll + calendar days, operational costs, debts, petty cash, assets). No derived values are stored. |
| `migrations/0002_rls.sql` | Role helper functions (`is_super_admin`, `is_admin_or_super`, `has_module`) + RLS policies enforcing role-based access **in the database**. |
| `migrations/0003_views.sql` | `security_invoker` views for computed fields (line totals, HPP/margin, sisa, running petty balance, straight-line depreciation) and the `get_pnl(year)` function. |
| `migrations/0004_storage_seed.sql` | `proofs` storage bucket + policies, and reference-data seed (roles, categories, payment methods/statuses). |

## Access model (enforced by RLS)

- **Super Admin** — full access to every table.
- **Admin / custom roles** — Dashboard + P&L always; other modules only when
  the module key is present in `profiles.modules`.
- All authenticated users may **read** the ledger and master data (Dashboard &
  P&L roll up every module). **Writes** are gated per module via `has_module()`.
- **Gaji (payroll) edit/delete** is restricted to **Super Admin & Admin**.
- **Manajemen Pengguna** (profiles, roles) is **Super Admin only**.

Module keys: `master, pembelian, penjualan, gaji, operasional, hutang, petty,
aset, pengguna`. `dashboard` and `pnl` are implicit for every user.

## Authentication

Users log in with an **ID Pengguna** (username) + password. The frontend maps
`username` → `username@<VITE_AUTH_EMAIL_DOMAIN>` (default
`catering-berkah.local`) and calls Supabase Auth with that email. The real
credential lives in `auth.users`; `public.profiles` holds the username, role,
and module permissions. Self-signup is disabled — only a Super Admin creates
accounts.

## Applying locally

```bash
# 1. Start the local stack (requires Docker + Supabase CLI)
supabase start

# 2. Apply migrations
supabase db reset          # runs every migration in order

# 3. Provision the initial accounts (real Auth users + profiles)
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_`supabase status`> \
AUTH_EMAIL_DOMAIN=catering-berkah.local \
node scripts/seed-users.mjs
```

## Applying to a hosted project

```bash
supabase link --project-ref <your-project-ref>
supabase db push
# then run scripts/seed-users.mjs against the hosted URL + service role key
```

Copy `.env.example` → `.env.local` and fill `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` for the frontend.
