# Sunset

AI-powered hospice care platform.

## Quick Start

1. Make sure **Docker Desktop** is running
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local Supabase stack:
   ```bash
   npx supabase start
   ```
4. Copy the keys from the output into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   SUPABASE_SERVICE_ROLE_KEY=<Secret key>
   ```
5. Run database migrations and seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
6. Start the app:
   ```bash
   npm run dev
   ```
7. Open [http://localhost:3000](http://localhost:3000) and sign in with one of the seed accounts below.

## Seed Accounts

All seed accounts use the password `admin123`.

| Email | Role | Lands on | Org |
|---|---|---|---|
| `admin@sunset.dev` | platform_admin | `/admin` | — |
| `org-admin@sunset.dev` | org_admin | `/org` | Sunrise Hospice |
| `practitioner@sunset.dev` | practitioner | `/org/patients` | Sunrise Hospice |
| `patient@sunset.dev` | patient | `/patient` | Sunrise Hospice (John Doe) |
| `relative@sunset.dev` | relative | `/relative` | Sunrise Hospice (Jane Doe, spouse of John Doe) |

## Role Hierarchy

Access is enforced top-down: each role manages everything below it and can read its ancestors.

```
platform_admin            manages: organizations
└── org_admin             manages: practitioners, patients (scoped to one org)
    └── practitioner      manages: patients + relatives (scoped to one org)
        └── patient       manages: own relatives; reads care team (practitioner, org)
            └── relative  reads: linked patient + care team
```

| Role | Can mutate | Can read upward |
|---|---|---|
| `platform_admin` | Everything | — |
| `org_admin` | Practitioners, patients, relatives in their org | — |
| `practitioner` | Patients and relatives in their org | Their organization |
| `patient` | Their own relatives | Practitioner, organization |
| `relative` | — (read-only) | Linked patient, practitioner, organization |

### How it's enforced

- **PostgREST (browser → Supabase REST API)** is gated by Postgres RLS policies declared in `lib/db/schema.ts`. Only the routes the frontend hits directly with the anon key (e.g. the login-redirect probe in `app/page.tsx`) go through this path.
- **Server actions** (`app/*/actions.ts`) connect via Drizzle as the `postgres` superuser, which bypasses RLS. Authorization is enforced explicitly by `requireXxx()` helpers (`requirePlatformAdmin`, `requireOrgUser`, `requireOrgAdmin`, `requirePatient`, `requireRelative`) at the top of every action.

This split is intentional: cross-table policies that try to walk the hierarchy at the RLS layer (e.g. "let a relative read their patient") cause infinite recursion in Postgres (`42P17`), so ancestor reads happen server-side via Drizzle instead.

## Database Workflow

Schema is defined in `lib/db/schema.ts` using Drizzle ORM. To make changes:

1. Edit `lib/db/schema.ts`
2. Generate a migration:
   ```bash
   npm run db:generate
   ```
3. Apply the migration:
   ```bash
   npm run db:migrate
   ```

Migration files are committed to `./drizzle/` and applied in order.

### Resetting the Database

To start fresh:

```bash
npx supabase db reset
npm run db:migrate
npm run db:seed
```

## Tests

```bash
npm run test:run
```
