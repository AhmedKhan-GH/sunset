# Database Connection Strategy

## Problem

Multiple `postgres()` clients created at module level across server actions exhaust connection slots. Each pool defaults to 10 connections, and Next.js hot reload in dev doesn't reliably clean up old module instances.

## Current State (broken)

```
lib/db/index.ts          → postgres() pool #1 (Drizzle)
notes-actions.ts         → postgres() pool #2 (raw SQL)
organization/notes/      → postgres() pool #3 (raw SQL)
patient/notes/           → postgres() pool #4 (raw SQL)
relative/notes/          → postgres() pool #5 (raw SQL)
```

5 pools × 10 connections = 50 slots consumed. Local Supabase Postgres has ~100 slots, so dev + seed + HMR easily exhausts them.

## Security Concern

All raw `postgres()` clients connect as the `postgres` superuser, bypassing RLS entirely. Application-layer checks (`requireOrganizationMember`, `requirePatient`, etc.) are the only access control. If those functions have a bug, data leaks across organizations with no safety net.

## Solution

### Layer 1: Single shared pool (connection fix)

Export one raw SQL client from `lib/db/index.ts`. All server actions import it instead of creating their own. Reduces connection count from 50 to 10.

### Layer 2: Supabase client for user-facing queries (security fix)

For queries that access PHI, use the Supabase server client which:
- Passes the user's JWT automatically
- Enforces RLS at the database level
- Provides defense-in-depth against application bugs

Reserve the raw postgres pool for:
- Drizzle ORM operations (schema-managed tables)
- Migrations and seeding
- Admin operations that legitimately need superuser

### When to use which

| Operation | Client | Why |
|-----------|--------|-----|
| Query patient_notes | Supabase server client | PHI, RLS enforced |
| Insert patient_notes | Supabase server client | PHI, RLS enforced |
| Query profiles/organizations via Drizzle | Shared postgres pool | Schema-managed, no PHI |
| Migrations | Shared postgres pool | Needs superuser |
| Seeding | Shared postgres pool | Needs superuser |

### Benefits

- **Connection exhaustion eliminated** — one pool, predictable slot usage
- **Defense-in-depth** — RLS catches application bugs before data leaks
- **Audit-ready** — Supabase logs all queries with the acting user's JWT, so the audit trail is automatic
- **Production-safe** — connection poolers (PgBouncer, Supabase pooler) work correctly with a single pool
