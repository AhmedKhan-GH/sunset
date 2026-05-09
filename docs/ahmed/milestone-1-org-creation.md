# Milestone 1: Platform Admin Creates an Organization

The simplest possible end-to-end demo. One user, one form, one database write.

## What We're Building

A platform admin logs in and creates a hospice organization. That's it.

## Schema (Drizzle)

### `profiles`

Replaces the existing table. Minimal for this milestone:

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | PK, FK → `auth.users` |
| `role` | text | `'platform_admin'` for now |
| `created_at` | integer | Unix timestamp, default `extract(epoch from now())` |
| `updated_at` | integer | Unix timestamp, default `extract(epoch from now())` |

RLS policies:
- Users can read their own profile

### `organizations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default random |
| `name` | text | not null |
| `created_at` | integer | Unix timestamp, default `extract(epoch from now())` |
| `updated_at` | integer | Unix timestamp, default `extract(epoch from now())` |

RLS policies:
- Platform admin can insert, update, delete
- Org members can read their own org

## Seed

1. Create auth user in Supabase dashboard (email: `admin@sunset.dev`, password: temporary)
2. `tsx lib/db/seed.ts` inserts one row into `profiles`:
   - `user_id` = the auth UID from step 1
   - `role` = `'platform_admin'`
   - `organization_id` = null

## Pages

### `/` (login)

Replaces the default Next.js Vercel page entirely.

- Email + password form
- Calls Supabase `signInWithPassword`
- On success, redirects based on role:
  - `platform_admin` → `/admin`
  - (other roles later)
- No sign-up link — accounts are created by admins, not self-registered

### `/admin` (platform admin dashboard)

Protected route — redirects to `/` if not authenticated or not `platform_admin`.

- Header: "Platform Admin"
- A list of existing organizations (empty initially)
- A "Create Organization" form: just a name field + submit button
- On submit: inserts into `organizations` table
- New org appears in the list

## Steps to Implement

1. Update `lib/db/schema.ts` — extend `profiles`, add `organizations` table with RLS policies
2. `drizzle-kit push` to apply schema to local Supabase
3. Create auth user in Supabase dashboard
4. Write and run `lib/db/seed.ts` to insert platform admin profile
5. Replace `app/page.tsx` with login form
6. Create `app/admin/page.tsx` with org list + creation form
7. Add auth middleware to protect `/admin` route
8. Test: log in → create org → see it in the list
