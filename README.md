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
7. Make sure [Ollama](https://ollama.com) is running locally with a model pulled:
   ```bash
   ollama pull gpt-oss:20b
   ```
8. Open [http://localhost:3000](http://localhost:3000) and sign in with one of the seed accounts below.

## Seed Accounts

All seed accounts use the password `admin123`.

### Staff

| Email | Role | Lands on | Organization |
|---|---|---|---|
| `admin@sunset.dev` | platform_admin | `/admin` | — |
| `maria.santos@sunset.dev` | organization_admin | `/organization` | Sunrise Hospice |
| `david.chen@sunset.dev` | organization_admin | `/organization` | Harbor Palliative Care |
| `dr.amara.okafor@sunset.dev` | practitioner | `/organization/patients` | Sunrise Hospice |
| `dr.james.whitfield@sunset.dev` | practitioner | `/organization/patients` | Sunrise Hospice |
| `nurse.priya.sharma@sunset.dev` | practitioner | `/organization/patients` | Sunrise Hospice |
| `dr.elena.rodriguez@sunset.dev` | practitioner | `/organization/patients` | Harbor Palliative Care |
| `nurse.ben.tanaka@sunset.dev` | practitioner | `/organization/patients` | Harbor Palliative Care |

### Patients

| Email | Name | Lands on | Organization |
|---|---|---|---|
| `dorothy.williams@sunset.dev` | Dorothy Williams | `/patient` | Sunrise Hospice |
| `robert.jackson@sunset.dev` | Robert Jackson | `/patient` | Sunrise Hospice |
| `margaret.chen@sunset.dev` | Margaret Chen | `/patient` | Sunrise Hospice |
| `harold.thompson@sunset.dev` | Harold Thompson | `/patient` | Sunrise Hospice |
| `evelyn.garcia@sunset.dev` | Evelyn Garcia | `/patient` | Harbor Palliative Care |
| `james.washington@sunset.dev` | James Washington | `/patient` | Harbor Palliative Care |
| `helen.kim@sunset.dev` | Helen Kim | `/patient` | Harbor Palliative Care |
| — | Arthur Patel | No portal login | Sunrise Hospice |
| — | Gloria Nguyen | No portal login | Harbor Palliative Care |

### Relatives

| Email | Name | Relationship | Patient |
|---|---|---|---|
| `carol.williams@sunset.dev` | Carol Williams | child | Dorothy Williams |
| `michael.williams@sunset.dev` | Michael Williams | child | Dorothy Williams |
| `linda.jackson@sunset.dev` | Linda Jackson | spouse | Robert Jackson |
| `steven.jackson@sunset.dev` | Steven Jackson | child | Robert Jackson |
| `henry.chen@sunset.dev` | Henry Chen | child | Margaret Chen |
| `betty.thompson@sunset.dev` | Betty Thompson | spouse | Harold Thompson |
| `carlos.garcia@sunset.dev` | Carlos Garcia | spouse | Evelyn Garcia |
| `patricia.garcia@sunset.dev` | Patricia Garcia | child | Evelyn Garcia |
| `ruth.washington@sunset.dev` | Ruth Washington | spouse | James Washington |
| `susan.kim@sunset.dev` | Susan Kim | child | Helen Kim |
| — | Thomas Kim | child (no portal login) | Helen Kim |
| — | Anita Patel | spouse (no portal login) | Arthur Patel |

## Role Hierarchy

Access is enforced top-down: each role manages everything below it.

```
platform_admin            manages: organizations
└── organization_admin    manages: practitioners, patients (scoped to one organization)
    └── practitioner      manages: patients + relatives (scoped to one organization)
        └── patient       manages: own relatives; reads care team
            └── relative  reads: linked patient + care team
```

### How access is enforced

1. **Middleware** (`proxy.ts`) — redirects unauthenticated users away from protected routes
2. **Layouts** (`app/*/layout.tsx`) — verify role and organization membership before rendering
3. **Server actions** (`app/*/actions.ts`) — `requireXxx()` helpers at the top of every action
4. **RLS policies** (`lib/db/schema.ts`) — row-level security in Postgres as a final safeguard

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

To start fresh (resets DB, restarts gateway, runs migrations and seed):

```bash
npm run db:reset
```

## Tests

```bash
npm run test:run
```
