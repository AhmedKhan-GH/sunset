# Supabase Setup

## Packages Installed

- **`@supabase/supabase-js`** (`^2.105.4`) — Core Supabase client for interacting with your Supabase project (auth, database, storage, realtime).
- **`@supabase/ssr`** (`^0.10.3`) — Cookie-based session management for server-side rendering in Next.js.

## Files Created

### `lib/supabase/client.ts`

Browser-side Supabase client. Use this in **Client Components** (files with `'use client'`).

```ts
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
```

### `lib/supabase/server.ts`

Server-side Supabase client. Use this in **Server Components**, **Route Handlers**, and **Server Actions**. The function is `async` because it accesses the cookie store.

```ts
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
```

### `middleware.ts`

Runs on every request (excluding static assets). Its sole job is to call `supabase.auth.getUser()` to refresh the auth token before it expires, keeping the user's session alive across server-rendered pages.

### `.env.local`

Contains two placeholder environment variables. Replace these with your actual values from the Supabase dashboard (**Settings > API**):

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

This file is gitignored and will not be committed.

## Usage Pattern

| Context | Import from | Example |
|---|---|---|
| Client Component | `@/lib/supabase/client` | `const supabase = createClient()` |
| Server Component | `@/lib/supabase/server` | `const supabase = await createClient()` |
| Route Handler | `@/lib/supabase/server` | `const supabase = await createClient()` |
| Server Action | `@/lib/supabase/server` | `const supabase = await createClient()` |
