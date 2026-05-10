# Changes — `shreyas-dev`

Module-by-module log of Supabase capability work. One section per module from `SUPABASE_PLANNING.md` §3.

---

## Module 1 — pgvector extension

**Date:** 2026-05-09
**Status:** ✅ Done & verified

**Migration:** `supabase/migrations/20260509120001_enable_pgvector.sql`
**Tests:** `tests/db/01_pgvector.test.sql` — 11 tests, all passing
**Commits:** `1c16454` (migration), `f1a42ca` (tests)

### What it does
Enables the `vector` extension (v0.8.0) so any table can declare a `vector(N)` column for embeddings.

### Why it's first
Every table that does RAG / semantic search needs this extension installed first. Tables with `vector(...)` columns will fail to create until pgvector is registered.

### What was verified
- Extension installed at v0.8.0
- `vector(768)` columns can be created and inserted into
- `vector_dims()` returns the correct dimension
- Wrong-dimension inserts are rejected
- Distance operators all work: cosine `<=>`, L2 `<->`, inner-product `<#>`
- Both `ivfflat` and `hnsw` index types build successfully
- ANN order-by-similarity returns expected rows

### How to re-run the test
```bash
psql "$DATABASE_URL" -f tests/db/01_pgvector.test.sql
```

---

## Module 3 — Auth

**Date:** 2026-05-09
**Status:** ✅ Done & verified

**Files added/changed:**
- `tests/auth/auth.integration.ts` — 22-assertion integration test
- `app/clinician/page.tsx` — placeholder for clinician role
- `app/caregiver/page.tsx` — placeholder for caregiver role
- `proxy.ts` — role-based redirect after login
- `app/page.tsx` — login form now redirects to `/` (proxy routes by role)
- `lib/db/seed-dev.ts` — added 2 extra users + 5 orgs for verification

### What it does
- Sign in / sign out via `signInWithPassword` works end-to-end
- After login, `proxy.ts` looks up the user's role from `profiles` and routes them to:
  - `platform_admin` → `/admin`
  - `clinician` → `/clinician`
  - `caregiver` → `/caregiver`
- Each role page reads RLS-filtered queries through the user-scoped server client and shows what that user can see (proves RLS is enforced through the JS client too, not just direct SQL)

### Bug fixed
The original `proxy.ts` redirected every logged-in user from `/` to `/admin`, while `/admin`'s `requirePlatformAdmin()` redirected non-admins back to `/` — causing an infinite loop and a `SecurityError` in the browser. Replaced the unconditional redirect with role-aware routing.

### What was verified
**Programmatic (22 assertions):**
- Sign-in returns access token + correct user
- platform_admin sees ≥5 orgs and can insert
- clinician/caregiver see 0 orgs and cannot insert
- Each user sees only their own profile, not others'
- anon (signed-out) sees nothing and cannot insert
- Wrong password returns "Invalid login credentials"
- Sign-out clears the session

**UI smoke (manual):**
- Each role lands on their own page after login
- Each page shows the role-appropriate visibility counts
- Wrong-role direct URL access shows "Not authorized" (no redirect loop)

### How to re-run the test
```bash
npx tsx --env-file=.env.local tests/auth/auth.integration.ts
```

---

## Module 4 — Realtime

**Date:** 2026-05-09
**Status:** ✅ Done & verified

**Migration:** `supabase/migrations/20260509130001_add_organizations_to_realtime.sql`
**Tests:** `tests/realtime/realtime.integration.ts` — 10 assertions, all passing

### What it does
Adds `public.organizations` to the `supabase_realtime` publication so Postgres CDC events fire on every INSERT / UPDATE / DELETE.

### Why this was needed
Supabase Realtime's container was already running and the `supabase_realtime` publication existed, but **zero tables had been added to it** — meaning no change events fired for anything. Realtime was "running" but useless until tables opt in.

### What was verified
**10 programmatic assertions:**
- Admin client receives INSERT events (with full row payload)
- Admin client receives UPDATE events (old + new values)
- Admin client receives DELETE events
- Clinician client receives **no** events for orgs (RLS denies — proves the realtime stream enforces RLS, not just direct queries)
- Anonymous client receives **no** events (no JWT)

### Pattern for adding new tables (Chris)
When new tables (`patients`, `clinical_impressions`, `symptom_events`, `utterances`, etc.) land, add each to the publication:

```sql
alter publication supabase_realtime add table public.<table_name>;
```

Realtime will then enforce whatever RLS policies the table has — make sure those exist before publishing.

### Gotchas worth knowing
- **First-subscribe cold start.** After `.subscribe()` reports `SUBSCRIBED`, allow ~500ms before triggering the first event — the replication slot needs warmup time. Subsequent events fire immediately.
- **RLS via JWT only.** Realtime evaluates RLS using the JWT attached to the connection at subscribe time. Without a JWT (anon role), policies that depend on `auth.uid()` always return null, so anon never receives events from RLS-protected tables.
- **`Broadcast` and `Presence` channels do NOT enforce RLS.** Only `postgres_changes` does. If you broadcast PHI by accident, every subscriber sees it.

### How to re-run the test
```bash
npx tsx --env-file=.env.local tests/realtime/realtime.integration.ts
```
