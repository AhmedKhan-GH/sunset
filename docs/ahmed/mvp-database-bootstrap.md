# MVP Database Bootstrap Plan

## Architecture: HIPAA-Compliant Access Control

### Core Principle: Minimum Necessary Access

No user has more access than their role requires. Administrative access and clinical access are **separate domains** — a platform admin can create organizations, an org admin can manage users but cannot see patient data, and a practitioner can see patient data but cannot create user accounts.

### Roles

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Platform Admin** | Create/deactivate organizations, provision org admins. Seeded once at deployment. | Access clinical data in any org, manage practitioners |
| **Org Admin** | Create/deactivate practitioner accounts, manage org settings, view audit logs | Access any clinical/patient data, manage other orgs |
| **Practitioner** | View/edit patient data for patients on their care team, enroll patients, invite related persons, add practitioners to their patients' care teams | Create user accounts, see patients outside their care team |
| **Related Person** | View their linked patient's care plan and updates | See other patients, modify clinical data, manage users |
| **Patient** | View their own care plan | Modify clinical records, manage users |

### Tables

- `organizations` — hospice orgs, created by platform admin
- `profiles` — linked to `auth.users`, stores role and org membership
- `patients` — belongs to an org
- `care_team_members` — join table: (patient_id, practitioner_id, role). **RLS pivot table** — all clinical access checks go through this.
- `related_persons` — links a user to a specific patient
- `care_plans` — clinical care plan for a patient
- `care_entries` — individual entries/notes in a care plan
- `alerts` — notifications for practitioners and related persons (Realtime subscription target)
- `audit_log` — records all data access (HIPAA requirement)

### RLS Strategy

- **Clinical tables** (patients, care_plans, care_entries, alerts): policy checks `care_team_members` for practitioners, `related_persons` for family/proxies
- **Platform tables** (organizations): policy checks `profiles.role = 'platform_admin'` for write, org members for read
- **Admin tables** (profiles, org settings): policy checks `profiles.role = 'org_admin'` within their org
- **Audit log**: insert-only for all authenticated users, read-only for org admins and platform admin
- Org admin policies grant **zero access** to clinical tables
- Platform admin policies grant **zero access** to clinical tables

## Drizzle-First Implementation

### Single Source of Truth: `lib/db/schema.ts`

All tables, RLS policies, and types are defined in Drizzle's TypeScript schema. No raw SQL migrations, no Supabase migration files. Drizzle owns the database state entirely.

```
lib/db/
  schema.ts    — table definitions + RLS policies (pgPolicy, enableRLS)
  index.ts     — Drizzle client initialization
  seed.ts      — TypeScript seed script
```

### Workflow

1. **Define** tables and RLS policies in `lib/db/schema.ts` using `pgTable`, `pgPolicy`, `.enableRLS()`
2. **Generate** SQL migrations: `drizzle-kit generate` → outputs to `./drizzle/`
3. **Apply** migrations: `drizzle-kit migrate` (production) or `drizzle-kit push` (dev)
4. **Seed** dev data: `tsx lib/db/seed.ts`

### RLS in Drizzle

```ts
import { pgTable, pgPolicy, uuid, text } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
}).enableRLS()

pgPolicy('platform admin manages orgs', {
  for: 'all',
  to: 'authenticated',
  on: organizations,
  using: sql`(SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin'`,
})
```

### Seed Script (`lib/db/seed.ts`)

Connects directly via `DATABASE_URL` as postgres superuser. No Supabase API key needed.

```ts
import { db } from './index'
import { profiles } from './schema'

await db.insert(profiles).values({
  userId: '<platform-admin-auth-uid>',
  role: 'platform_admin',
})
```

Run with `tsx lib/db/seed.ts`. For dev, the platform admin auth user is created in the Supabase dashboard. In production, a one-off bootstrap script calls the Supabase Admin API.

## Bootstrap Sequence

### 1. Deployment Seed (one-time)

The **only** seeded credential in the entire system:

1. Create a Supabase auth user (via dashboard or Admin API)
2. Run seed script to insert a profile row with `role = 'platform_admin'`
3. Platform admin logs in and changes their password

Everything else flows through the app.

### 2. Platform Admin Creates Organizations

Via an in-app UI, the platform admin:

- Creates an organization (e.g., "Sunset Hospice")
- Assigns its first org admin

### 3. Org Admin Onboards Practitioners

The org admin creates practitioner accounts within their org. Each practitioner gets:

- A Supabase auth account
- A profile row with role `practitioner` linked to the org

Practitioners exist but have **no patient access** until assigned to care teams.

### 4. Practitioners Enroll Patients

When a patient is admitted to hospice, a practitioner:

1. Creates the patient record
2. Is automatically added to that patient's care team
3. Creates the initial care plan

### 5. Care Team Expansion

A practitioner on a patient's care team can:

- Add other practitioners (nurse, chaplain, social worker) to **that patient's** care team
- Invite related persons (family, healthcare proxy) scoped to **that patient only**

### 6. Related Person Access

Related persons receive an invite (email link) from a care team member. Upon sign-up, they are linked to the specific patient and can view (not edit) care plan information.

## MVP Priorities (Hackathon)

1. **Schema + RLS + seed data** — all tables above with policies, defined in Drizzle
2. **Auth + dashboard** — login, protected routes, patient list
3. **Patient detail view** — care plan display, elderly-friendly UI
4. **AI agent with MCP tools** — Ollama + tools that write to Supabase (schedule_checkin, create_alert, add_care_entry)
5. **Realtime alerts** — subscribe to `alerts` table on dashboard
6. **Scheduled check-ins** — cron trigger that invokes the agent per patient

Steps 1-4 are core demo. Steps 5-6 are stretch goals.

## AI Agent Integration

- Ollama runs locally with a tool-calling model (Llama 3.1+, Qwen 2.5+)
- MCP tools: `schedule_checkin`, `create_alert`, `add_care_entry`
- Tools write to Supabase, which triggers Realtime for connected practitioners
- Agent receives patient context (care plan, recent entries) as system prompt
- Scheduled check-ins via `pg_cron` or Supabase Edge Function invoking the agent
