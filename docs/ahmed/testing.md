# Test Suite Documentation

## Overview

The project uses **Vitest** with **React Testing Library** and **jsdom** for unit and component testing. All tests live under `__tests__/` mirroring the source directory structure.

**Run tests:**
- `npm test` — watch mode (re-runs on file changes)
- `npm run test:run` — single run (CI-friendly)

## Test Setup

**File:** `__tests__/setup.ts`

Stubs environment variables so tests never touch real services:

| Variable | Test Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://test.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `test-anon-key` |
| `DATABASE_URL` | `postgresql://test:test@localhost:5432/test` |

## `__tests__/lib/db/schema.test.ts` — Database Schema

Tests Drizzle ORM schema definitions using `getTableColumns` and `getTableName` introspection — no database connection needed. Add a new `describe` block for each table you create.

| Test | What it verifies |
|---|---|
| has the correct table name and columns | The `profiles` table exists with columns `id`, `email`, `displayName`, `createdAt`, `updatedAt` |
