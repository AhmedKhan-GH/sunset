# Chat State Issues & Fixes

## Current Problems

### 1. Race condition: conversation creation blocks inference

When the user sends the first message in a new chat, `handleSubmit` creates a conversation
via `POST /api/conversations` **before** calling `sendMessage()`. This is sequential —
the conversation must be created first so the `conversationId` is available in the body
sent to `/api/chat`. But two things go wrong:

- The `useChat` hook and the conversation creation are fighting over timing. The `body`
  callback reads `convIdRef.current`, but the ref may not be set before the transport
  fires the request.
- The API route at `/api/chat` **also** tries to create a conversation if `conversationId`
  is null (lines 30–39), meaning we have two competing creation paths — one client-side
  and one server-side.

**Fix:** Remove client-side conversation creation entirely. Let the server be the single
source of truth — if no `conversationId` is provided, the server creates the conversation,
persists the message, runs inference, and returns the conversation ID in a response header.
The client reads the header after the response and updates the sidebar.

### 2. "New" button should just clear the chat, not be a distinct action

The current "New" button in the sidebar header calls `startNewChat()` which clears state
and increments the key. This is the correct behavior — it resets the `ChatMessages`
component so the next message triggers a new conversation. The button label should change
from "+ New" to "Clear" to communicate that it simply resets the chat window.

But really, the issue is deeper: the user doesn't want a button at all for creating chats.
Just typing into an empty chat area should create one. The sidebar should only show past
conversations and a clear/reset option.

**Fix:** Rename "+ New" to "Clear" (or a small icon). The clear action resets the chat
window to its empty state. The next message typed creates a new conversation automatically
on the server.

### 3. Double message creation

The client creates the conversation, then `sendMessage()` sends all messages to `/api/chat`.
The server sees the `conversationId` and inserts the user message again (lines 42–58 in
route.ts). This can cause duplicate user messages in the database.

**Fix:** With server-only conversation creation, the server knows exactly which messages
are new. On the first request (no `conversationId`), it creates the conversation and
inserts the first user message. On subsequent requests (with `conversationId`), it only
inserts the latest user message.

## Chat Naming Strategy

### Current approach
The conversation title is set to the first user message, truncated to 100 characters.
This leads to titles like "Can you tell me about Dorothy Williams' medication schedule"
which is functional but verbose and not unique.

### Short-term fix (implement now)
Use the first user message truncated to 60 characters with ellipsis. This is good enough
for the demo — titles are descriptive and require no extra infrastructure.

### Long-term approach (post-demo)
Use the local LLM to generate a short title after the first exchange:

1. After the assistant's first response, send a lightweight follow-up to Ollama:
   `"Summarize this conversation in 5 words or fewer: [user message] [assistant response]"`
2. Update the conversation title with the result.
3. This runs async — the user doesn't wait for it.

**Why not now:** Adds latency, complexity, and a second Ollama call per new conversation.
For the hackathon demo, the first-message approach is clear enough.

### Uniqueness
Titles don't need to be unique — the conversation ID is the primary key. Users
differentiate by title + recency. If two chats have the same title, the timestamps
in the sidebar (added later) will distinguish them.

## Implementation Plan (incremental commits)

### Commit 1: Server-only conversation creation
- Remove client-side `POST /api/conversations` from `handleSubmit`
- Server creates conversation when `conversationId` is null
- Client reads `X-Conversation-Id` header from the stream response
- Remove `createdRef` and the pre-send fetch

### Commit 2: Fix sidebar UX
- Change "+ New" to "Clear" 
- On clear: reset chat window, set `conversationId` to null
- Refresh conversation list after each assistant response
- Show titles truncated to 60 chars with ellipsis
