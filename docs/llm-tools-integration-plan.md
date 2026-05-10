# LLM Tools Integration Plan

## Goal

Replace the fragmented per-patient / per-org search tools with a single **general `searchNotes` tool** that automatically scopes results based on the logged-in user's session, and extend `addPatientNote` to all roles with note-creation permission (practitioner + organization_admin).

---

## Current State

- **6 search-related tools** exist across `notes-tools.ts` and `search-tools.ts`:
  - `searchPatientNotesTool` — single patient, semantic
  - `recentPatientNotesTool` — single patient, chronological
  - `searchOrgNotesTool` — org-wide, semantic
  - `searchPatientNotesByDateTool` — single patient, semantic + date range
  - `recentOrgActivityTool` — org-wide, chronological
  - `addPatientNoteTool` — practitioner-only insert

- Each tool has its own auth function (`authorizeNoteAccess`, `authorizeOrgAccess`) that reads the session from Supabase cookies.

- The chat route (`app/api/chat/route.ts`) registers all tools and uses Ollama via Vercel AI SDK.

---

## Design: Unified `searchNotes` Tool

### Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Semantic search query (embedded via all-mpnet-base-v2) |
| `patientId` | uuid | no | Scope to a single patient (LLM provides after resolving name) |
| `since` | ISO datetime | no | Lower bound on created_at |
| `until` | ISO datetime | no | Upper bound on created_at |
| `limit` | int (1-20) | no | Max results (default 10) |

### Authorization & Scoping (Session-Based RLS)

The tool reads the session from Supabase server client cookies — no explicit role parameter needed.

| Caller Role | Behavior |
|-------------|----------|
| `organization_admin` | Searches all notes in their organization |
| `practitioner` | Searches all notes in their organization |
| `patient` | Searches only their own notes (patient_id = their patient record) |
| `relative` | Searches only notes for their linked patient |

Implementation:
1. Call `createClient()` → get `auth.getUser()`
2. Load profile → determine role + organization_id
3. If patient/relative role: force `patientId` to their linked patient (ignore any passed patientId)
4. If practitioner/organization_admin: use passed `patientId` or search org-wide
5. Apply `since`/`until` filters if provided
6. Run pgvector cosine search with `organization_id` scope

### Output

```typescript
{
  results: Array<{
    noteId: string;
    patientId: string;
    patientName: string;
    authorName: string;
    content: string;
    similarity: number;
    createdAt: string; // ISO
  }>
}
```

---

## Design: Extended `addPatientNote` Tool

### Current Restriction

Only `practitioner` role can call `addPatientNote` (enforced in `authorizeNoteAccess`).

### Change

Allow both `practitioner` and `organization_admin` to create notes via the tool.

Implementation: change the `allowedRoles` parameter from `["practitioner"]` to `["practitioner", "organization_admin"]`.

The RLS INSERT policy already grants organization admins write access (committed earlier), so the raw SQL insert will succeed for both roles.

---

## Implementation Steps

### 1. Create unified auth helper (`lib/ai/auth.ts`)

Single function to resolve caller context:

```typescript
type CallerContext = {
  userId: string;
  role: string;
  organizationId: string;
  patientId?: string; // set for patient/relative roles
};
```

- Reads Supabase session
- Loads profile
- For patient role: resolves their patient record ID
- For relative role: resolves linked patient ID
- Returns structured context (no redirect, returns error for tools)

### 2. Rewrite `searchNotes` tool (`lib/ai/tools/search-tools.ts`)

- Remove `searchOrgNotesTool`, `searchPatientNotesByDateTool`, `recentOrgActivityTool`
- Replace with single `searchNotesTool` that uses the unified auth
- SQL query always scopes by `organization_id`
- Optionally filters by `patient_id`, `since`, `until`
- For patient/relative callers: forces their linked patient_id

### 3. Keep `recentNotes` as a separate tool

A chronological "what's new" tool is still useful for the LLM when no semantic query is needed. Simplify to one `recentNotesTool` that accepts optional `patientId` and uses the same auth/scoping logic.

### 4. Update `addPatientNote` allowed roles

Change from `["practitioner"]` to `["practitioner", "organization_admin"]`.

### 5. Update chat route (`app/api/chat/route.ts`)

- Remove old tool imports
- Register: `searchNotes`, `recentNotes`, `addPatientNote` (+ roster/self tools unchanged)
- Update system prompt to reflect simplified tool set

### 6. Update system prompt

Simplify instructions now that one tool handles all search:
- "Use `searchNotes` for any semantic question about notes. Pass `patientId` if about one patient."
- "Use `recentNotes` for chronological feeds."
- "Use `addPatientNote` to persist observations (practitioner/admin only)."

---

## What We Keep Unchanged

- `lib/llm/embed.ts` — embedding infrastructure
- `lib/ai/tools/roster-tools.ts` — patient/practitioner lookup tools
- `lib/ai/tools/self-tools.ts` — patient/relative self-service tools
- `lib/ai/ollama.ts` — model provider config
- Database schema (`patient_notes` table, indexes, existing RLS policies)
- The `notes-tools.ts` `searchPatientNotesTool` and `recentPatientNotesTool` can be merged into the unified versions

---

## Security Invariants

1. Every tool call reads the session from cookies — no role spoofing possible
2. Raw SQL always includes `WHERE organization_id = $ctx.organizationId`
3. Patient/relative callers can never read other patients' notes (patientId is forced server-side)
4. Note creation requires explicit role check before insert
5. The LLM cannot bypass auth — tools return `{ error }` and the system prompt tells it not to retry
