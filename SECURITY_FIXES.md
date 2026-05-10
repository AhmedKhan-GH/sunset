# Security Fixes — Notes RLS Enforcement

**Date:** 2026-05-10
**Branch:** installing-supabase

## Problem

All `patient_notes` read queries used raw SQL via Drizzle (`DATABASE_URL`), which bypasses Supabase Row Level Security entirely. This meant:

- **Patients could see all notes in their organization**, not just their own.
- **Relatives could see all notes in their organization**, not just their linked patient's.
- The AI agent's `addPatientNote` tool **rejected note creation for patients and relatives**, even though the UI forms allowed it.
- Multiple files created standalone `postgres()` connections instead of using the shared `lib/db` client, making query behavior inconsistent and harder to audit.

## Root Cause

RLS policies were correctly defined in `supabase/snippets/patient_notes.sql`, but every query went through a direct Postgres connection (Drizzle) rather than the Supabase PostgREST client that enforces those policies. No application-level filtering was applied to compensate.

## Changes

### 1. `lib/notes/actions.ts` — Read/write scoping

| Function | Before | After |
|---|---|---|
| `getNotes` | Filtered by `organization_id` only | Falls back to `ctx.patientId` for patients/relatives — they only see their own notes |
| `createNote` | Used Supabase client (inconsistent with reads) | Uses Drizzle raw SQL; validates `patientId === ctx.patientId` for patients/relatives |
| `searchNotes` | Already used `effectivePatientId` | No change needed |
| `keywordSearchNotes` | Already used `effectivePatientId` | No change needed |

Removed `supabase` from `NoteContext` — auth is handled internally, queries go through Drizzle.

### 2. `lib/ai/tools/notes-tools.ts` — Agent note creation

- Removed the `NOTE_CREATION_ROLES` allowlist that blocked patients and relatives from creating notes via the AI agent.
- Made `patientId` optional in the tool schema — patients/relatives have it resolved automatically from `caller.patientId`; practitioners/admins must provide it.
- Organization-boundary check retained: the target patient must belong to the caller's organization.
- Replaced standalone `postgres()` connection with shared `sql` from `lib/db`.

### 3. `lib/ai/tools/self-tools.ts` — Connection consolidation

- Replaced standalone `postgres()` connection with shared `sql` from `lib/db`.

### 4. `lib/ai/tools/search-tools.ts` — Connection consolidation

- Replaced standalone `postgres()` connection with shared `sql` from `lib/db`.

## Access Matrix (after fix)

| Role | Read own notes | Read org notes | Create own notes | Create any org note |
|---|---|---|---|---|
| Patient | Yes | No | Yes | No |
| Relative | Yes (linked patient) | No | Yes (linked patient) | No |
| Practitioner | Yes (all org) | Yes | No | Yes |
| Organization Admin | Yes (all org) | Yes | No | Yes |

## Files Changed

- `lib/notes/actions.ts`
- `lib/ai/tools/notes-tools.ts`
- `lib/ai/tools/self-tools.ts`
- `lib/ai/tools/search-tools.ts`
