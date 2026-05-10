# Realtime & Messaging Status

**Date:** 2026-05-10

---

## Supabase Realtime

**Status:** Enabled in `supabase/config.toml` but not used anywhere in the application.

- No tables added to `supabase_realtime` publication
- No `supabase.channel()` or `.on('postgres_changes')` subscriptions in any component
- No websocket-based live updates between users
- All data is request/response — changes are only visible on page refresh

---

## Current Chat System

**Type:** AI assistant (user-to-LLM), not person-to-person messaging.

- Each user has private conversations with an Ollama-powered AI assistant
- System prompt: clinical assistant for hospice care
- Uses Vercel AI SDK with streaming responses
- `conversations` and `messages` tables scoped per user via RLS
- Available at `/admin/chat`, `/organization/chat`, `/patient/chat`, `/relative/chat`
- AI has a `sendNotification` tool for proactive alerts

**No person-to-person messaging exists.**

---

## Two Features Needed

### 1. Realtime Data Sync

When one user creates or modifies data, other authorized users see it instantly without refreshing.

**Use cases:**
- Caregiver adds a note → practitioner's notes page updates live
- Caregiver submits a checkup form → clinician feed shows it immediately
- Organization admin creates a patient → practitioner list updates

**Implementation:** Publish PHI tables to `supabase_realtime` publication, add client-side `postgres_changes` subscriptions in React components. RLS applies to realtime — users only receive events for rows they have SELECT access to.

### 2. Direct Messaging

Private conversations between a patient (or relative) and their assigned practitioner.

**Use cases:**
- Patient asks practitioner a question about medication
- Relative reports a concern and gets a response
- Practitioner follows up on a checkup or note

**Key design decisions:**
- Scope: one-to-one between patient/relative and their assigned practitioner
- Should practitioners see messages from all their assigned patients in one inbox?
- Should organization admins have visibility into message threads?
- Are messages PHI? (Yes — same RLS and audit treatment as notes)
- Append-only or deletable?
- Realtime delivery via Supabase Realtime subscriptions

**Depends on:** Realtime infrastructure (feature 1) for live message delivery.
