# Chat Persistence & Audit Logs

## Current State

Chat is fully stateless. Messages live in React state (`useChat`) and are lost on page
navigation or refresh. The API route (`/api/chat`) streams responses without persisting
anything server-side.

## Why Persistence Matters

- **Continuity** — users expect to resume conversations across sessions
- **Medical records** — HIPAA requires that clinical communications be retained and auditable
- **Accountability** — tool invocations (notifications, orders, referrals) need a traceable origin

## Proposed Schema

### `conversations` table

| Column            | Type        | Notes                                    |
|-------------------|-------------|------------------------------------------|
| id                | uuid (PK)   | Default `gen_random_uuid()`              |
| organizationId    | uuid (FK)   | Scopes conversation to an organization   |
| userId            | uuid (FK)   | The user who owns this conversation      |
| role              | text        | Role at time of creation (for audit)     |
| title             | text        | Auto-generated or user-set               |
| createdAt         | timestamptz | Immutable                                |
| updatedAt         | timestamptz | Last message timestamp                   |

### `messages` table (append-only)

| Column           | Type        | Notes                                     |
|------------------|-------------|-------------------------------------------|
| id               | uuid (PK)   | Default `gen_random_uuid()`               |
| conversationId   | uuid (FK)   | References `conversations.id`             |
| role             | text        | `user`, `assistant`, `tool`               |
| content          | text        | The message body                          |
| toolName         | text        | Null unless role = `tool`                 |
| toolInput        | jsonb       | Tool call arguments                       |
| toolOutput       | jsonb       | Tool call result                          |
| createdAt        | timestamptz | Immutable, set on insert                  |

**Append-only enforcement:**
- No `UPDATE` or `DELETE` grants on the `messages` table for application roles
- RLS policy: `USING (false)` for UPDATE/DELETE operations
- Only `INSERT` and `SELECT` are permitted
- This satisfies the medical record immutability requirement

### `audit_logs` table (append-only)

| Column       | Type        | Notes                                          |
|--------------|-------------|-------------------------------------------------|
| id           | uuid (PK)   | Default `gen_random_uuid()`                    |
| userId       | uuid (FK)   | Who performed the action                        |
| action       | text        | e.g. `tool.sendNotification`, `chat.create`     |
| resource     | text        | e.g. `message`, `conversation`, `patient`       |
| resourceId   | uuid        | The affected resource                           |
| metadata     | jsonb       | Additional context (inputs, outputs, patient)   |
| createdAt    | timestamptz | Immutable                                       |

**Same append-only enforcement as messages.**

## RLS Policies

### conversations
- Platform admin: read all
- Organization admin: read all within their organization
- Practitioner: read own conversations
- Patient: read own conversations
- Relative: read own conversations

### messages
- Inherits access from parent conversation (join-based policy)
- No user can update or delete

### audit_logs
- Platform admin: read all
- Organization admin: read within their organization
- All other roles: no direct access (logs are written server-side)

## Implementation Plan

### Phase 1: Schema & Migrations
- Add `conversations` and `messages` tables to Drizzle schema
- Add `audit_logs` table
- Generate and apply migrations
- Add RLS policies with append-only enforcement

### Phase 2: API Changes
- Modify `/api/chat` route to:
  1. Authenticate the request (get user from Supabase session)
  2. Create or resume a conversation
  3. Insert each user message before sending to Ollama
  4. Insert each assistant message/tool call as it streams
- Add `GET /api/conversations` to list user's conversations
- Add `GET /api/conversations/[id]` to load message history

### Phase 3: UI Changes
- Add conversation sidebar/list to each portal's chat page
- Load message history into `useChat` via `initialMessages`
- Add "New conversation" button

### Phase 4: Audit Logging
- Log every tool invocation with inputs, outputs, and associated patient (if any)
- Log conversation creation and access events
- Server-side only — never trust client for audit data

## HIPAA Considerations

- **Append-only messages** = immutable medical record. No edits, no deletes.
- **Audit logs** capture who accessed what, when, and what tools were invoked.
- **RLS** ensures users only see their own conversations within their organization.
- **No client-side persistence** — messages are only stored in Postgres, not localStorage or cookies.
- **Retention policy** — define a retention period (e.g. 7 years for medical records) enforced via pg_cron archival, not deletion.
