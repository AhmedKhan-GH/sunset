# shreyas-dev Integration Plan

**Branch:** `origin/shreyas-dev` into `installing-supabase`  
**Date:** 2026-05-09  
**Strategy:** Incremental cherry-pick, one commit group at a time

---

## Branch Diff Summary

- **89 files** changed across the two branches
- **~6,100 lines added**, **~4,830 lines removed**
- 21 commits on `shreyas-dev` not yet on `installing-supabase`

### What shreyas-dev introduces

| Capability | Key Files |
|---|---|
| pgvector extension + embeddings | migration, `lib/llm/embed.ts`, tests |
| RLS test suite | `tests/db/02_rls.test.sql` |
| Auth integration tests | `tests/auth/auth.integration.ts` |
| Realtime CDC (organizations, cron_pings, patient_checkins) | migration, `app/admin/live/`, tests |
| pg_cron scheduled jobs | migration, `cron_pings` table |
| HIPAA audit log (append-only) | migration, `audit` schema, trigger, tests |
| Patient check-in scheduler | migration, `app/clinician/checkins-feed.tsx` |
| Patient self-report checkup form + clinician live feed | migration, `app/caregiver/checkup-form.tsx`, `app/clinician/checkups/` |
| Clinician semantic search UI | `app/clinician/search-notes.tsx`, `actions.ts` |
| Negative (filter-out) search | combined into clinician search |
| Caregiver checkup submission portal | `app/caregiver/page.tsx`, `actions.ts`, `checkup-form.tsx` |
| Role-based routing in proxy | `proxy.ts` changes |
| Dev seed script | `lib/db/seed-dev.ts` |
| Shreyas module documentation | `docs/Shreyas/` |

### What shreyas-dev removes

| Removed | Why |
|---|---|
| Chat system (components/chat-panel, API routes, conversation/message tables) | LLM chat is not persisted; stateless API approach instead |
| Organization/patient/relative portals | Premature; Chris still designing these |
| Drizzle migrations 0001-0003 | Superseded by Supabase raw SQL migrations |
| Schema tables (practitioners, patients, relatives, conversations, messages) | Kept minimal; only profiles + organizations in Drizzle |
| `lib/ai/ollama.ts` + Vercel AI SDK deps | Replaced by `@xenova/transformers` for local embedding |
| `lib/supabase/admin.ts` | Consolidated; service role key passed at invocation |
| Old docs (chat-persistence, chat-state-issues, database-stuff, tailwind-only, vercel-ai-sdk-ollama) | Superseded by module docs |
| `app/login-actions.ts` | Routing moved to `proxy.ts` |
| npm scripts (db:migrate, db:generate, db:seed, db:reset, infra:start/stop) | Simplified to direct commands |

---

## Dependency Changes

| Action | Package | Notes |
|---|---|---|
| **Remove** | `@ai-sdk/openai` | No longer using OpenAI adapter |
| **Remove** | `@ai-sdk/react` | No longer using useChat hooks |
| **Remove** | `ai` | Vercel AI SDK core removed |
| **Remove** | `zod` | Was used by AI SDK tool schemas |
| **Add** | `@xenova/transformers` | Local ONNX embedding (all-mpnet-base-v2) |

`next.config.ts` adds `serverExternalPackages: ["@xenova/transformers"]` to prevent webpack from bundling ONNX/WASM files.

---

## Conflict Risk Assessment

The two branches have **heavily diverged**. The primary tension:

1. **`installing-supabase` has a working chat system** (chat-panel, conversation API routes, message persistence) that shreyas-dev deletes entirely.
2. **`installing-supabase` has organization/patient/relative portals** that shreyas-dev strips out.
3. **Schema.ts** is radically different: installing-supabase has 7+ tables; shreyas-dev has 2.

**Recommendation:** Do not attempt a merge. Cherry-pick functionality in layers, preserving what exists on `installing-supabase` where it doesn't conflict, and deliberately choosing what to remove.

---

## Integration Phases

### Phase 1: Foundation -- pgvector + Embeddings

**What:** Enable the pgvector extension and add the local embedding utility.

**Files to bring in:**
- `supabase/migrations/20260509120001_enable_pgvector.sql`
- `lib/llm/embed.ts`
- `next.config.ts` change (add `serverExternalPackages`)

**Dependency changes:**
- Add `@xenova/transformers`

**Tests to bring in:**
- `tests/db/01_pgvector.test.sql`
- `tests/db/pgvector_semantic_demo.ts`

**Does NOT touch:** schema.ts, routes, UI, existing chat system.

**Why first:** Everything else (semantic search, check-ins) depends on pgvector being available. The embedding utility is a pure addition with zero conflicts.

---

### Phase 2: Dev Seed Script + RLS Tests

**What:** Add the development seed script (clinician + caregiver users, sample organizations) and the RLS test suite.

**Files to bring in:**
- `lib/db/seed-dev.ts`
- `tests/db/02_rls.test.sql`
- `lib/db/seed.ts` changes (simplification)

**Does NOT touch:** schema.ts tables beyond what seed needs, UI routes.

**Why second:** The seed users (nurse@sunset.dev, caregiver@sunset.dev) are prerequisites for auth, realtime, and audit tests. RLS tests validate the security model before building UI on top of it.

---

### Phase 3: Auth Integration Tests + Role-Based Routing

**What:** Add auth tests and update `proxy.ts` with role-based home-page routing.

**Files to bring in:**
- `tests/auth/auth.integration.ts`
- `proxy.ts` changes (protected routes list + ROLE_HOME mapping)
- `app/page.tsx` login form simplification

**Removes:**
- `app/login-actions.ts` (routing logic moves to proxy)

**Conflict notes:** The proxy change replaces `["/admin", "/organization", "/patient", "/relative"]` with `["/admin", "/clinician", "/caregiver"]`. This means the old organization/patient/relative routes would stop being protected. Only apply this when those portals are ready to be retired.

**Decision point:** Do you want to keep the old portals accessible during transition? If so, we can add `/clinician` and `/caregiver` to the protected list while retaining the old routes temporarily.

---

### Phase 4: Realtime CDC Infrastructure

**What:** Enable realtime on the organizations table and add the admin live-feed demo.

**Files to bring in:**
- `supabase/migrations/20260509130001_add_organizations_to_realtime.sql`
- `app/admin/live/page.tsx`
- `app/admin/live/live-feed.tsx`
- `tests/realtime/realtime.integration.ts`
- `tests/realtime/watch.ts`

**Does NOT touch:** existing admin pages, chat system, schema.

**Why here:** Realtime is additive. The `/admin/live` page is a new route that doesn't conflict with anything. The realtime publication migration is a one-liner.

---

### Phase 5: pg_cron + Scheduled Jobs

**What:** Enable pg_cron extension and the demo ping table.

**Files to bring in:**
- `supabase/migrations/20260510004000_pg_cron_ping_demo.sql`

**Does NOT touch:** UI (the live-feed from Phase 4 already displays cron_pings).

**Why here:** pg_cron is needed before patient check-ins (Phase 7). The demo ping validates the infrastructure works end-to-end through realtime.

---

### Phase 6: HIPAA Audit Log

**What:** Create the `audit` schema with the append-only access log and triggers.

**Files to bring in:**
- `supabase/migrations/20260510120000_audit_log.sql`
- `tests/audit/audit.integration.ts`
- `tests/audit/demo.ts`

**Does NOT touch:** Application code, UI, schema.ts.

**Why here:** The audit trigger must exist before patient_checkins (Phase 7) since that migration attaches a trigger to it. Audit is pure database infrastructure with zero app-layer conflicts.

---

### Phase 7: Patient Check-In Scheduler + Clinician Dashboard

**What:** Add the patient check-ins table, scheduled jobs, and the clinician dashboard UI (check-in feed + semantic search).

**Files to bring in:**
- `supabase/migrations/20260510140000_patient_checkins.sql`
- `app/clinician/page.tsx`
- `app/clinician/actions.ts`
- `app/clinician/checkins-feed.tsx`
- `app/clinician/search-notes.tsx`

**Dependencies:** Phases 1 (pgvector/embed), 5 (pg_cron), 6 (audit trigger).

**Conflict notes:** None. The `/clinician` route is entirely new. Server actions use the embed utility from Phase 1 and raw postgres for vector queries.

---

### Phase 8: Patient Self-Report Checkup Form + Clinician Checkups Feed

**What:** Add the caregiver-facing checkup submission form and the clinician-facing live checkups feed. This is the real-time caregiver-to-clinician data pipeline.

**New commit:** `3285a62 add patient self-report checkup form + clinician live feed`

**Migration:** `supabase/migrations/20260510160000_patient_checkups.sql`
- Creates `patient_checkups` table with 6 symptom scores (pain, nausea, headache, fatigue, anxiety, shortness_of_breath) on 0-10 scale, plus patient_name and notes
- RLS: caregivers can INSERT (own user_id only), clinicians can SELECT all, users can SELECT own
- Added to `supabase_realtime` publication for live streaming
- Audit trigger attached (`audit.log_change()`)

**Files to bring in:**
- `supabase/migrations/20260510160000_patient_checkups.sql`
- `app/caregiver/page.tsx` (updated: now renders checkup form instead of placeholder)
- `app/caregiver/actions.ts` (server action: `submitCheckup()` with auth + RLS)
- `app/caregiver/checkup-form.tsx` (client component: 6 symptom sliders + patient name + notes)
- `app/clinician/checkups/page.tsx` (SSR: fetches last 50 checkups, clinician-gated)
- `app/clinician/checkups/checkups-feed.tsx` (client component: realtime subscription to new checkups, color-coded symptom badges)
- `app/clinician/page.tsx` changes (adds nav link to `/clinician/checkups`)

**Data flow:** Caregiver submits form → server action inserts into `patient_checkups` → audit trigger logs → realtime publication fires → clinician's websocket receives INSERT event → checkup appears in feed instantly. Color coding: red (score >= 8), amber (>= 5), yellow (>= 2), gray (0-1).

**Dependencies:** Phase 6 (audit trigger), Phase 4 (realtime infrastructure), Phase 7 (clinician page exists).

**Does NOT conflict with:** Anything on `installing-supabase`. All new routes.

---

### Phase 9: Semantic Search Benchmarks

**What:** Add the remaining pgvector benchmark and test scripts.

**Files to bring in:**
- `tests/db/pgvector_semantic_1000.ts`
- `tests/db/pgvector_model_comparison.ts`
- `tests/db/pgvector_semantic_requery.ts`

**Does NOT touch:** Any existing functionality.

---

### Phase 10: Documentation

**What:** Bring in the Shreyas module documentation.

**Files to bring in:**
- `docs/Shreyas/CHANGES.md`
- `docs/Shreyas/SUPABASE_PLANNING.md`
- `docs/Shreyas/MCP_SETUP.md`
- `docs/Shreyas/modules/` (all 7 module docs)

**Does NOT touch:** Code.

---

### Phase 11: Cleanup -- Removals (DELIBERATE DECISION)

**What:** Remove superseded code. Each sub-step is a separate commit.

**11a -- Remove old docs:**
- `docs/chat-persistence-audit-logs.md`
- `docs/chat-state-issues.md`
- `docs/database-stuff-integration-plan.md`
- `docs/tailwind-only-styling.md`
- `docs/vercel-ai-sdk-ollama-tool-calling.md`

**11b -- Remove Vercel AI SDK + Ollama:**
- `lib/ai/ollama.ts`
- `lib/supabase/admin.ts`
- Remove packages: `@ai-sdk/openai`, `@ai-sdk/react`, `ai`, `zod`

**11c -- Remove chat system:**
- `components/chat-panel.tsx`
- `app/admin/chat/` (chat-panel.tsx, page.tsx)
- `app/api/chat/route.ts`
- `app/api/conversations/` (all route files)
- `app/admin/layout.tsx` (navigation header referencing chat)

**11d -- Remove organization/patient/relative portals:**
- `app/organization/` (all files)
- `app/patient/` (all files)
- `app/relative/` (all files)

**11e -- Slim down schema.ts:**
- Remove practitioners, patients, relatives, conversations, messages tables
- Remove Drizzle migrations 0001-0003
- Remove npm scripts (db:migrate, db:generate, db:seed, db:reset, infra:start/stop)

**11f -- CSS + README cleanup:**
- Remove custom animation delay utilities from globals.css
- Update README to match new simplified setup

---

## Phase Dependency Graph

```
Phase 1 (pgvector + embed)
  |
  +---> Phase 2 (seed + RLS tests)
  |       |
  |       +---> Phase 3 (auth tests + routing)
  |
  +---> Phase 4 (realtime CDC)
  |       |
  |       +---> Phase 5 (pg_cron)
  |               |
  |               +---> Phase 6 (audit log)
  |                       |
  |                       +---> Phase 7 (check-ins + clinician UI)
  |                               |
  |                               +---> Phase 8 (caregiver checkup form + clinician checkups feed)
  |
  +---> Phase 9 (benchmarks) [independent]
  +---> Phase 10 (docs) [independent]

Phase 11 (cleanup) -- after all above are confirmed working
```

---

## Open Questions Before Starting

1. **Chat system:** Do we want to keep the existing chat system during integration, or is it safe to remove? If keeping, Phase 10c should be deferred indefinitely.

2. **Organization/patient/relative portals:** Same question. Chris is redesigning these -- do we keep the current implementations as reference, or clean-slate?

3. **Drizzle schema slimming:** Removing tables from schema.ts means removing them from Drizzle's management. The shreyas-dev approach is "only Drizzle what's stable." Are you aligned with that strategy?

4. **Proxy route protection:** When we update the protected routes in Phase 3, should we keep the old routes (`/organization`, `/patient`, `/relative`) in the protected list as a safety net, or remove them immediately?

5. **npm scripts:** The old convenience scripts (`db:migrate`, `db:seed`, etc.) are removed in shreyas-dev. Want to keep them or switch to direct commands?
