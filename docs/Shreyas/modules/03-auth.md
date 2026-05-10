# Module 3 — Auth

**Date:** 2026-05-09
**Status:** ✅ Done & verified

## Files added/changed
- `tests/auth/auth.integration.ts` — 22-assertion integration test
- `app/clinician/page.tsx` — placeholder for clinician role
- `app/caregiver/page.tsx` — placeholder for caregiver role
- `proxy.ts` — role-based redirect after login
- `app/page.tsx` — login form now redirects to `/` (proxy routes by role)
- `lib/db/seed-dev.ts` — added 2 extra users + 5 orgs for verification

## What it does
- Sign in / sign out via `signInWithPassword` works end-to-end
- After login, `proxy.ts` looks up the user's role from `profiles` and routes them to:
  - `platform_admin` → `/admin`
  - `clinician` → `/clinician`
  - `caregiver` → `/caregiver`
- Each role page reads RLS-filtered queries through the user-scoped server client and shows what that user can see (proves RLS is enforced through the JS client too, not just direct SQL)

## Bug fixed
The original `proxy.ts` redirected every logged-in user from `/` to `/admin`, while `/admin`'s `requirePlatformAdmin()` redirected non-admins back to `/` — causing an infinite loop and a `SecurityError` in the browser. Replaced the unconditional redirect with role-aware routing.

## What was verified

### Programmatic (22 assertions)
- Sign-in returns access token + correct user
- platform_admin sees ≥5 orgs and can insert
- clinician/caregiver see 0 orgs and cannot insert
- Each user sees only their own profile, not others'
- anon (signed-out) sees nothing and cannot insert
- Wrong password returns "Invalid login credentials"
- Sign-out clears the session

### UI smoke (manual)
- Each role lands on their own page after login
- Each page shows the role-appropriate visibility counts
- Wrong-role direct URL access shows "Not authorized" (no redirect loop)

## How to re-run the test
```bash
npx tsx --env-file=.env.local tests/auth/auth.integration.ts
```
