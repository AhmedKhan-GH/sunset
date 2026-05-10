# database-stuff Branch Integration Plan

## What the branch contains

A complete role-based healthcare app with 5 user types, 4 tables, RLS policies, and dedicated portals for each role.

### Schema (4 tables)

| Table | Key Columns | Purpose |
|---|---|---|
| **organizations** | id, name | Hospice organizations |
| **profiles** | user_id, role, org_id | Auth users with role (platform_admin, org_admin, practitioner) |
| **patients** | id, org_id, practitioner_id, user_id, name, dob, gender | Patient records, scoped to org |
| **relatives** | id, patient_id, user_id, name, relationship | Family members linked to a patient |

### RLS Policies

- **organizations**: platform admin full access; org members can read their own org
- **profiles**: users can read own profile only
- **patients**: platform admin full; org_admin/practitioner full within their org; patient reads own record
- **relatives**: platform admin full; patient manages own relatives; relative reads own record; org members manage relatives of org patients

### Routes added

| Route | Role | What it does |
|---|---|---|
| `/admin` | platform_admin | Manage organizations (already exists on our branch) |
| `/org` | org_admin | Manage practitioners, view patients |
| `/org/patients` | org_admin, practitioner | CRUD patients, add relatives |
| `/org/patients/[id]` | org_admin, practitioner | Patient detail + relatives |
| `/patient` | patient | View own record, care team, manage relatives |
| `/relative` | relative | View linked patient and care team |

### Login routing

After login, the user is routed based on role:
- platform_admin → `/admin`
- org_admin → `/org`
- practitioner → `/org/patients`
- patient (checked via patients table) → `/patient`
- relative (checked via relatives table) → `/relative`

### Seed data (6 accounts, all password: admin123)

| Email | Role |
|---|---|
| admin@sunset.dev | platform_admin |
| org-admin@sunset.dev | org_admin (Sunrise Hospice) |
| practitioner@sunset.dev | practitioner (Sunrise Hospice) |
| patient@sunset.dev | patient (John Doe) |
| relative@sunset.dev | relative (Jane Doe, spouse) |

---

## How it interfaces with our code

### Shared base
Both branches diverged from commit `44d1196` (add npm scripts). They share the same schema.ts, seed.ts, and migration 0000 up to that point.

### Conflicts expected

| File | Conflict | Reason |
|---|---|---|
| `lib/db/schema.ts` | **High** | We have the original 2-table schema; they added patients, relatives, org_id on profiles |
| `lib/db/seed.ts` | **High** | We seed 1 user; they seed 6 users across all roles |
| `app/page.tsx` | **Medium** | We have the same login form; they added role-based routing after login |
| `app/admin/page.tsx` | **Low** | They added a layout wrapper and minor consistency tweaks; we added a Chat link |
| `proxy.ts` | **None** | Unchanged on their branch |
| `package.json` | **Medium** | We added AI SDK deps and ollama scripts; they didn't |

### No conflict (net-new files)
- `app/org/**` — entire org portal (new)
- `app/patient/**` — entire patient portal (new)
- `app/relative/**` — entire relative portal (new)
- `lib/supabase/admin.ts` — admin auth client (new)
- `drizzle/0001-0004` migrations (new)

---

## Suggested integration phases

### Phase 1: Schema + Migrations
**Commits:** `d3df585`, `2abd059`, `da6cfdb`, `33577e8`

Add the expanded schema (patients, relatives, org_id on profiles) and all migrations. This is the foundation everything else depends on.

- Update `lib/db/schema.ts` with new tables and columns
- Add migration files `0001` through `0004`
- No UI changes yet — just database structure

**Risk:** Must reset local Supabase DB after applying (`supabase db reset`).

### Phase 2: Seed data
**Commits:** `d3df585` (seed portion), `501ecec`, `819ad1d`

Expand seed.ts to create all 6 demo accounts. Depends on Phase 1 schema being in place.

**Risk:** Low. Seed is destructive anyway (drops and recreates).

### Phase 3: Login routing
**Commits:** `a449515`, `30979ba` (login portions)

Update `app/page.tsx` to route users to the correct portal after login based on their role. Must merge carefully with our existing login page.

**Risk:** Medium. Our login page is similar but theirs adds role-checking logic.

### Phase 4: Admin layout
**Commits:** `e5667c0`

Add the admin layout wrapper (header with nav, role display, sign-out). Must preserve our Chat link.

**Risk:** Low. Additive change, just need to keep our nav link.

### Phase 5: Org portal
**Commits:** `1c9402c`, `393a120`, `7632c1e`

Add the full org admin + practitioner portal (`/org`, `/org/patients`, `/org/patients/[id]`). Also adds `lib/supabase/admin.ts`.

**Risk:** Low. Entirely new files, no conflicts.

### Phase 6: Patient portal
**Commits:** `3df6ee0`, `1d888df`

Add the patient portal (`/patient`). Depends on Phase 1 schema and Phase 3 login routing.

**Risk:** Low. New files only.

### Phase 7: Relative portal
**Commits:** `30979ba`, `1d888df`

Add the relative portal (`/relative`). Depends on Phase 1 schema and Phase 3 login routing.

**Risk:** Low. New files only.

### Phase 8: README
**Commits:** `1a739f8`, `61112dd`

Update README with role hierarchy and demo login credentials.

**Risk:** None.

---

## Summary

Phases 1-3 are the critical path (schema, seed, login routing). Phases 4-7 are additive portals that drop in cleanly. Phase 8 is docs.

Total: ~2,700 lines of new code across 29 files. Most of it is net-new files that won't conflict. The main merge pain is in schema.ts, seed.ts, and page.tsx.
