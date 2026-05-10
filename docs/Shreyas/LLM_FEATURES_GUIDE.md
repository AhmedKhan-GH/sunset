# LLM Features Implementation Guide

**Branch:** `shreyas-llm-tools`
**Status:** ✅ Three features shipped: DMs, AI-driven notifications, extended semantic search
**Total LLM tools available in chat:** 17

This is the reference doc for adding more chat tools, realtime features, or RLS-protected tables in the same shape as what shipped here. Read the "patterns" sections before extending.

---

## What this branch added on top of `installing-supabase`

| Feature | What the user can do |
|---|---|
| **Direct Messages (DMs)** | Patient ↔ practitioner, patient ↔ relative, relative ↔ patient's practitioner. Live updates via realtime. |
| **AI-driven notifications** | LLM can ping the practitioner, all relatives, or the whole care team when a check-in or message indicates something concerning. Recipients see a live inbox. |
| **Extended semantic search** | LLM tools now cover org-wide search (across all patients in an org), date-bounded search, and chronological "what's new" feeds. |

---

## End-to-end architecture

```
                        ┌──────────────────────────┐
                        │   patient / relative     │
                        │   /chat ▸ asks "I'm in   │
                        │   bad pain, alert team"  │
                        └────────────┬─────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────┐
        │  POST /api/chat (streamText + tools)                │
        │  - 17 tools registered, each role-gated             │
        │  - stopWhen: stepCountIs(8)                         │
        └──────────────┬──────────────────────────────────────┘
                       │  picks tool
                       ▼
        ┌─────────────────────────────────────────────────────┐
        │  pingCareTeamTool.execute()                         │
        │  - validates caller, derives patient                │
        │  - INSERT one notifications row per recipient       │
        │  - returns { recipientCount: 5 }                    │
        └──────────────┬──────────────────────────────────────┘
                       │  CDC fires (notifications in
                       │   supabase_realtime publication)
                       ▼
        ┌─────────────────────────────────────────────────────┐
        │  every recipient's open browser:                    │
        │  - <NotificationsInbox /> subscribed to             │
        │    postgres_changes filtered by recipient_id        │
        │  - bell shows unread count, panel pops new entry    │
        └─────────────────────────────────────────────────────┘
```

The DM flow is the same shape, just `dm_messages` instead of `notifications` and a participant filter instead of recipient_id.

---

## Feature 1 — Direct Messages

### Files

| File | Role |
|---|---|
| `supabase/migrations/20260510170000_direct_messages.sql` | `dm_threads` + `dm_messages` schema, RLS, realtime publication |
| `lib/dm/policy.ts` | `canDm(userIdA, userIdB)` — pure relationship-validation |
| `lib/dm/actions.ts` | Server Actions: `getOrCreateThread`, `listMyThreads`, `listMessages`, `sendMessage`, `markThreadRead` |
| `components/dm-panel.tsx` | Client Component — message list + composer, subscribes to realtime |

### Schema

```sql
create table dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null,
  user_b_id uuid not null,
  -- canonical ordering: user_a_id < user_b_id, so unique catches dupes
  unique (user_a_id, user_b_id),
  check (user_a_id < user_b_id)
);

create table dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references dm_threads(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
```

### RLS pattern (relationship-validated at thread creation, participation-checked at message)

- **Thread RLS:** `auth.uid()` must be `user_a_id` or `user_b_id`. That's it.
- **Message RLS:** `auth.uid()` must be a participant of the thread (subquery on `dm_threads`).
- **Relationship validation lives in the Server Action**, not in RLS. `getOrCreateThread()` calls `canDm(a, b)` from `lib/dm/policy.ts` before INSERT. Once the thread exists, RLS just checks participation — fast and simple.

This is the **right-shape** for DMs: relationship complexity in app code, simple participation checks in the database.

### Allowed pairs (in `canDm`)

- `practitioner` ↔ `patient` — same `organization_id`
- `practitioner` ↔ `relative` — relative's linked patient is in practitioner's org
- `patient` ↔ `relative` — relative.patientId points to the patient

Other combinations return `{ allowed: false, reason }`. Add new pairs by extending the role-pair switch.

### Wiring into a page

```tsx
// app/patient/messages/page.tsx (example)
import { listMyThreads } from "@/lib/dm/actions";
import { DmPanel } from "@/components/dm-panel";

export default async function Page() {
  const threads = await listMyThreads();
  // ... render thread list, on click pass thread.id to DmPanel
  return <DmPanel threadId={selectedThreadId} currentUserId={user.id} />;
}
```

---

## Feature 2 — AI-driven Notifications

### Files

| File | Role |
|---|---|
| `supabase/migrations/20260510170100_notifications.sql` | `notifications` table, RLS, realtime publication |
| `lib/notifications/actions.ts` | Inbox Server Actions: `listMyNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead` |
| `lib/ai/tools/notification-tools.ts` | LLM tools: `pingPractitionerTool`, `pingRelativesTool`, `pingCareTeamTool` |
| `components/notifications-inbox.tsx` | Client Component — bell icon, unread badge, popover panel, urgency colors |

### Schema

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  sender_id uuid,                            -- null = system / AI
  sender_label text not null,                -- "Dr. Okafor", "Dorothy (patient)", "AI"
  patient_id uuid references patients(id) on delete cascade,
  title text not null,
  body text not null,
  urgency text not null default 'normal'
    check (urgency in ('low','normal','high','urgent')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
```

### RLS pattern (recipient-only read/update; permissive insert + app-layer validation)

- SELECT: `recipient_id = auth.uid()`
- UPDATE: `recipient_id = auth.uid()` (only used to set `read_at`)
- INSERT: any authenticated user can insert. **The validation that the caller is allowed to ping this recipient lives in the tool's `execute()` function, not in RLS.**

This is the **inverse** of the DM pattern: there, validation is at thread-creation; here, validation is per-insert. The reason: every notification is its own decision (anyone could ping anyone in theory; we constrain *who can ping whom* per tool).

### Tool spec

| Tool | Caller role | What it does |
|---|---|---|
| `pingPractitioner` | `patient`, `relative` | Notifies the patient's assigned practitioner. Caller's patient is auto-derived. |
| `pingRelatives` | `practitioner` | Notifies all of a patient's relatives who have portal access. |
| `pingCareTeam` | `practitioner`, `patient`, `relative` | The headline AI tool — notifies practitioner + every relative-with-portal-access. Default urgency `high`. |

`sender_label` derivation:
- Caller is practitioner → `practitioners.specialty` (fallback "Practitioner")
- Caller is patient → `"<patient name> (patient)"`
- Caller is relative → `"<relative name> (<relationship> of <patient name>)"`

### When the AI should call these

The chat's system prompt now includes:

> Use `pingCareTeam` for urgent/worsening situations or after a check-in flags concerns. Always include a clear title and a body that states what happened and what to do.

If you add a check-in submission flow, have its server action call `pingCareTeam` directly when scores cross a threshold (e.g., pain ≥ 8). The same tool path works whether triggered by the LLM or by app code.

---

## Feature 3 — Extended semantic search tools

### File

`lib/ai/tools/search-tools.ts`. Three exported tools.

| Tool | Caller role | Use case |
|---|---|---|
| `searchOrgNotes` | `practitioner`, `organization_admin` | Cross-patient semantic search across the caller's whole org. "Which patients mentioned chest pain this month?" |
| `searchPatientNotesByDate` | `practitioner`, `organization_admin` | Single-patient semantic search with optional `since`/`until` ISO dates. "Show me Dorothy's pain notes since last Monday." |
| `recentOrgActivity` | `practitioner`, `organization_admin` | Chronological feed across the org. "What's new today?" |

These complement the original `searchPatientNotesTool` which is single-patient, no date filter.

### Date handling note

`patient_notes.created_at` is `timestamptz`. The date-range tool passes ISO strings cast to `timestamptz` in SQL:

```sql
where (${since}::timestamptz is null or n.created_at >= ${since}::timestamptz)
  and (${until}::timestamptz is null or n.created_at <= ${until}::timestamptz)
```

Postgres-js returns `Date` objects for `timestamptz` columns; the tool serializes them to ISO strings for the model.

---

## All 17 tools registered in `app/api/chat/route.ts`

Grouped by role:

```
┌─────────────────────────────────────────────────────────────────┐
│  Per-patient notes (practitioner, organization_admin)           │
│   • searchPatientNotes                                          │
│   • recentPatientNotes                                          │
│   • addPatientNote                  (practitioner only)         │
│   • searchPatientNotesByDate                                    │
├─────────────────────────────────────────────────────────────────┤
│  Org-wide search (practitioner, organization_admin)             │
│   • searchOrgNotes                                              │
│   • recentOrgActivity                                           │
├─────────────────────────────────────────────────────────────────┤
│  Roster (practitioner, organization_admin)                      │
│   • listMyPatients                                              │
│   • findPatientByName                                           │
│   • getPatientDetails                                           │
│   • listOrganizationPractitioners                               │
├─────────────────────────────────────────────────────────────────┤
│  Self (patient, relative)                                       │
│   • getMyOrganization                                           │
│   • getMyCareTeam                                               │
│   • getMyRecentNotes                                            │
│   • getMyRelatives                  (patient only)              │
├─────────────────────────────────────────────────────────────────┤
│  Notifications                                                  │
│   • pingPractitioner                (patient, relative)         │
│   • pingRelatives                   (practitioner)              │
│   • pingCareTeam                    (any)                       │
└─────────────────────────────────────────────────────────────────┘
```

`stopWhen: stepCountIs(8)` — the model can chain up to 8 steps in one turn (e.g. `findPatientByName → searchPatientNotes → recentPatientNotes → pingCareTeam → final answer`).

---

## Pattern: add a new chat tool

Use this checklist any time you want the LLM to be able to do a new thing.

1. **Pick a file** — group by role:
   - `lib/ai/tools/notes-tools.ts` for per-patient note actions
   - `lib/ai/tools/roster-tools.ts` for patient/practitioner directory
   - `lib/ai/tools/self-tools.ts` for patient/relative self-service
   - `lib/ai/tools/search-tools.ts` for cross-patient or date-filtered queries
   - `lib/ai/tools/notification-tools.ts` for sending notifications
   - Or create a new file under `lib/ai/tools/` for a new domain.

2. **Define the tool** with `tool()` from `ai`:
   ```ts
   import { tool } from "ai";
   import { z } from "zod";
   import { createClient } from "@/lib/supabase/server";

   export const myNewTool = tool({
     description: "One sentence the LLM uses to decide when to call this. Be specific about when to use it AND when NOT to use it.",
     inputSchema: z.object({
       someInput: z.string().describe("What this means to the LLM"),
       limit: z.number().int().min(1).max(20).default(5),
     }),
     execute: async (input) => {
       // 1. Auth check
       const supabase = await createClient();
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return { error: "Not authenticated." };

       // 2. Role + relationship check
       // e.g. fetch profile, verify role, verify org match

       // 3. Do the work
       // e.g. db.select() or sql`...`

       // 4. Return STRUCTURED data (not a stringified message)
       return { results: [...] };
     },
   });
   ```

3. **Auth rules:**
   - Always check auth inside `execute`. The chat route doesn't pre-gate.
   - Return `{ error: "..." }` for permission failures. **Never throw.** The model needs to handle it gracefully.
   - Use the user-scoped client (`createClient` from `@/lib/supabase/server`) so RLS is enforced. Use `db` from `@/lib/db` for typed queries; use `postgres()` from `postgres` only when you need raw SQL (e.g., vector ops on `patient_notes`).

4. **Wire into `app/api/chat/route.ts`:**
   ```ts
   import { myNewTool } from "@/lib/ai/tools/<file>";
   // ...
   tools: {
     // ... existing
     myNewTool,
   }
   ```

5. **Update the system prompt** in `route.ts` so the LLM knows when to call the new tool. One sentence in the right group. Also bump `stopWhen` if the tool extends the typical chain length.

6. **Test in the browser.** Sign in as the relevant role, open `/chat`, ask a question that should trigger the tool. Look at the response — the AI SDK shows tool calls with their inputs/outputs.

---

## Pattern: add a new realtime-published table

```sql
-- 1. Define the table
create table public.<your_table> ( ... );
alter table public.<your_table> enable row level security;

-- 2. RLS policies (every role that should read or write)
create policy "..." on public.<your_table> for select to authenticated using (...);

-- 3. Add to the realtime publication
alter publication supabase_realtime add table public.<your_table>;
```

```tsx
// 4. Subscribe from a Client Component
useEffect(() => {
  const supabase = createClient();
  let channel: ReturnType<typeof supabase.channel> | null = null;

  (async () => {
    // CRITICAL: pin the JWT to the realtime client BEFORE subscribing,
    // or the channel connects as anon and RLS hides every event.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.realtime.setAuth(session.access_token);

    channel = supabase
      .channel("name-of-my-channel")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "<your_table>",
        filter: `recipient_id=eq.${userId}`,  // optional row-level filter
      }, (payload) => {
        // payload.new has the inserted row
      })
      .subscribe();
  })();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}, []);
```

**Common gotchas:**
- Forgetting `setAuth` → silent zero events
- Using `postgres_changes` with `Broadcast` channels → mixing concepts; broadcast doesn't enforce RLS
- Missing the `filter` clause when only one row's events matter → flood of irrelevant events

---

## Pattern: choosing where validation lives

Two patterns appeared in this branch:

| Pattern | When to use | Examples |
|---|---|---|
| **Validate at creation** (RLS just checks participation/ownership) | Long-lived relationships where validation is expensive once | `dm_threads` — `canDm()` runs once at thread creation |
| **Validate per-action** (RLS permissive, app layer enforces) | Each action is its own decision | `notifications` — each ping checks the relationship anew; `patient_notes` insert checks org+role |

Both are correct. Pick based on whether the relationship is durable (DM) or per-event (notification).

---

## Migrations applied on this branch

```
20260509120001_enable_pgvector.sql      pgvector extension
20260509120002_patient_notes.sql         clinical notes + embeddings
20260510170000_direct_messages.sql       DMs (NEW)
20260510170100_notifications.sql         notifications (NEW)
```

To apply locally on a fresh DB:

```bash
npm run db:migrate           # Drizzle migrations
psql "$DATABASE_URL" -f supabase/migrations/20260509120001_enable_pgvector.sql
psql "$DATABASE_URL" -f supabase/migrations/20260509120002_patient_notes.sql
psql "$DATABASE_URL" -f supabase/migrations/20260510170000_direct_messages.sql
psql "$DATABASE_URL" -f supabase/migrations/20260510170100_notifications.sql
npm run db:seed
```

Or just `npm run db:reset` to do all of the above in one shot (it runs `supabase db reset` which auto-applies any `supabase/migrations/*.sql` then chains Drizzle).

---

## How to wire UI

### DM panel on `/patient`

```tsx
import { getOrCreateThread } from "@/lib/dm/actions";
import { DmPanel } from "@/components/dm-panel";

// On a button click "Message my doctor":
const result = await getOrCreateThread(practitionerUserId);
if ("error" in result) toast(result.error);
else setActiveThread(result.threadId);

// Then render:
<DmPanel
  threadId={activeThread}
  currentUserId={user.id}
  otherDisplayName="Dr. Okafor"
/>
```

### Notifications bell in any layout

```tsx
import { NotificationsInbox } from "@/components/notifications-inbox";

// Drop into your top nav:
<NotificationsInbox />
```

The component fetches its own initial state and subscribes to realtime; no props needed.

---

## Testing the AI-driven ping in the browser

1. Make sure Ollama is running: `ollama serve` + `ollama pull gpt-oss:20b`
2. `npm run dev`
3. Open two browser windows:
   - Patient: sign in as `dorothy.williams@sunset.dev` / `admin123` → `/patient/chat`
   - Practitioner: sign in as `dr.amara.okafor@sunset.dev` / `admin123` → `/organization` (or wherever the inbox component is mounted)
4. Patient says in chat: *"My pain is really bad — please let my care team know."*
5. Model calls `pingCareTeam`, inserts notifications.
6. Practitioner's inbox shows a new high-urgency entry within ~1 second (no refresh).

---

## What still doesn't work / is worth knowing

- **No realtime CDC for tool errors.** If a tool fails silently (e.g., misconfigured service-role key), the model will say it succeeded because the tool returned `{ recipientCount: 0 }`. Mitigation: tools log to stderr; check the dev server log when something seems off.
- **`addPatientNote` writes via the RLS-bypassing connection.** This matches the existing notes-actions pattern but is a real concern in production. The note's `author_id` is set to `auth.uid()`, which is correct, but a malicious caller could in theory set someone else's id. Server-side mitigation already in place: `author_id = user.id` is set by the action, not by the LLM.
- **DM display names use email when no patient/relative name exists.** Practitioners have no `name` column on profiles, so they show as their email. Add a `display_name` column on profiles to fix.
- **Notifications don't cluster.** A `pingCareTeam` produces one row per recipient. The inbox shows them all individually. For a v2, group by `(patient_id, sender_id, created_at within 5 min)`.

---

## Files inventory (everything new on this branch)

```
docs/Shreyas/LLM_FEATURES_GUIDE.md             ← this file

lib/ai/tools/notes-tools.ts                    ← per-patient (3 tools)
lib/ai/tools/roster-tools.ts                   ← directory (4 tools)
lib/ai/tools/self-tools.ts                     ← patient/relative (4 tools)
lib/ai/tools/search-tools.ts                   ← extended search (3 tools)
lib/ai/tools/notification-tools.ts             ← AI ping tools (3 tools)

lib/dm/actions.ts                              ← DM Server Actions
lib/dm/policy.ts                               ← canDm() relationship validator

lib/notifications/actions.ts                   ← inbox Server Actions

components/dm-panel.tsx                        ← DM chat UI
components/notifications-inbox.tsx             ← notifications bell + panel

supabase/migrations/20260510170000_direct_messages.sql
supabase/migrations/20260510170100_notifications.sql

app/api/chat/route.ts                          ← (modified) all 17 tools registered
```
