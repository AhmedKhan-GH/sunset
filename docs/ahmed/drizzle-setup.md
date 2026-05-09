# Drizzle ORM Setup

## Packages Installed

- **`drizzle-orm`** — TypeScript ORM with type-safe queries, zero runtime overhead.
- **`postgres`** (postgres.js) — PostgreSQL driver used by Drizzle to connect to Supabase.
- **`drizzle-kit`** (dev) — CLI for generating and running migrations, introspecting databases, and launching Drizzle Studio.

## Files Created

### `drizzle.config.ts`

Configuration for `drizzle-kit`. Points to the schema file and sets the migration output directory. Reads `DATABASE_URL` from environment variables.

### `lib/db/index.ts`

Database client. Initializes the postgres.js connection and wraps it with Drizzle, binding the schema for relational queries.

```ts
import { db } from "@/lib/db";

const users = await db.query.profiles.findMany();
```

### `lib/db/schema.ts`

Schema definitions using Drizzle's TypeScript table builders. Ships with a starter `profiles` table:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, auto-generated |
| `email` | `text` | Unique, not null |
| `display_name` | `text` | Nullable |
| `created_at` | `timestamptz` | Defaults to now |
| `updated_at` | `timestamptz` | Defaults to now |

### `.env.local` (updated)

Added `DATABASE_URL` placeholder. Get the connection string from your Supabase dashboard under **Settings > Database > Connection string > URI**.

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## Common Commands

| Command | Description |
|---|---|
| `npx drizzle-kit generate` | Generate SQL migration files from schema changes |
| `npx drizzle-kit migrate` | Run pending migrations against the database |
| `npx drizzle-kit push` | Push schema directly to the database (skips migration files) |
| `npx drizzle-kit studio` | Open Drizzle Studio (browser-based data viewer) |
