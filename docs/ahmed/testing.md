# Test Suite Documentation

## Overview

The project uses **Vitest** with **React Testing Library** and **jsdom** for unit and component testing. All tests live under `__tests__/` mirroring the source directory structure.

**Run tests:**
- `npm test` — watch mode (re-runs on file changes)
- `npm run test:run` — single run (CI-friendly)

---

## Test Setup

**File:** `__tests__/setup.ts`

Stubs environment variables so tests never touch real services:

| Variable | Test Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://test.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `test-anon-key` |
| `DATABASE_URL` | `postgresql://test:test@localhost:5432/test` |

---

## `__tests__/app/page.test.tsx` — Home Page

Tests the `Home` component from `app/page.tsx`. Mocks `next/image` as a plain `<img>` tag.

| # | Test | What it verifies |
|---|---|---|
| 1 | renders the heading | An `<h1>` exists with text "To get started, edit the page.tsx file." |
| 2 | renders the Next.js logo | An image with alt "Next.js logo" exists, pointing to `/next.svg` |
| 3 | renders the Deploy Now link with security attributes | The "Deploy Now" link opens in a new tab (`target="_blank"`) with `rel="noopener noreferrer"` to prevent tab-napping |
| 4 | renders the Documentation link | The "Documentation" link exists and points to `nextjs.org/docs` |
| 5 | renders the Templates link | The "Templates" link exists and points to `vercel.com/templates` |
| 6 | renders the Learning center link | The "Learning" link exists and points to `nextjs.org/learn` |
| 7 | renders the Vercel logomark | An image with alt "Vercel logomark" exists, pointing to `/vercel.svg` |

---

## `__tests__/middleware.test.ts` — Auth Middleware

Tests the Supabase auth middleware from `middleware.ts`. Mocks `@supabase/ssr` and `next/server`.

| # | Test | What it verifies |
|---|---|---|
| 1 | exports a route matcher config | `config.matcher` is defined and contains exactly one pattern |
| 2 | matcher pattern is a valid regex string | The matcher string can be compiled into a `RegExp` without throwing |
| 3 | matcher uses a negative lookahead to exclude static assets | The pattern contains exclusions for `_next/static`, `_next/image`, `favicon.ico`, and image extensions (`svg`, `png`, `jpg`, `jpeg`, `gif`, `webp`) |
| 4 | calls supabase.auth.getUser to refresh the session | `createServerClient` is called with the correct URL, anon key, and cookie handlers; `auth.getUser()` is invoked to refresh tokens |
| 5 | returns a response object | The middleware returns a response with a `cookies` property |

---

## `__tests__/lib/supabase/client.test.ts` — Browser Supabase Client

Tests the browser-side client factory from `lib/supabase/client.ts`. Mocks `createBrowserClient` from `@supabase/ssr`.

| # | Test | What it verifies |
|---|---|---|
| 1 | creates a browser client with the correct environment variables | `createBrowserClient` is called with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 2 | returns the client instance from createBrowserClient | The returned object has an `auth` property |
| 3 | creates a new client on each call | Calling `createClient()` twice results in two calls to `createBrowserClient` (no singleton caching) |

---

## `__tests__/lib/supabase/server.test.ts` — Server Supabase Client

Tests the server-side client factory from `lib/supabase/server.ts`. Mocks `next/headers` cookies and `createServerClient` from `@supabase/ssr`.

| # | Test | What it verifies |
|---|---|---|
| 1 | creates a server client with the correct environment variables | `createServerClient` is called with the correct URL, anon key, and a cookies config containing `getAll` and `setAll` |
| 2 | returns a client with auth capabilities | The returned client has `auth.getUser` available |
| 3 | delegates getAll to the cookie store | Calling the cookies `getAll` handler invokes the underlying `cookieStore.getAll()` |
| 4 | delegates setAll to the cookie store | Calling `setAll` with a cookie array invokes `cookieStore.set()` with the correct name, value, and options |
| 5 | handles setAll errors gracefully (Server Component context) | When `cookieStore.set()` throws (as it does in Server Components), the error is silently caught and does not propagate |

---

## `__tests__/lib/db/schema.test.ts` — Database Schema

Tests the Drizzle ORM schema definitions from `lib/db/schema.ts`. Uses Drizzle's `getTableColumns` and `getTableName` introspection utilities — no database connection needed.

| # | Test | What it verifies |
|---|---|---|
| 1 | is named 'profiles' | The table's SQL name is `profiles` |
| 2 | has all expected columns | Columns `id`, `email`, `displayName`, `createdAt`, `updatedAt` all exist |
| 3 | has exactly 5 columns | No extra columns have been added unintentionally |
| 4 | id — is a UUID primary key with default | Type is `PgUUID`, is a primary key, and has a default value (`defaultRandom()`) |
| 5 | email — is a non-nullable unique text field | Type is `string`, `notNull` is true, `isUnique` is true |
| 6 | displayName — is a nullable text field | `notNull` is false (nullable) |
| 7 | displayName — maps to the display_name database column | The underlying SQL column name is `display_name` |
| 8 | createdAt — is a non-nullable timestamp with default | `notNull` and `hasDefault` are both true, type is `PgTimestamp` |
| 9 | createdAt — maps to the created_at database column | The underlying SQL column name is `created_at` |
| 10 | updatedAt — is a non-nullable timestamp with default | `notNull` and `hasDefault` are both true, type is `PgTimestamp` |
| 11 | updatedAt — maps to the updated_at database column | The underlying SQL column name is `updated_at` |
