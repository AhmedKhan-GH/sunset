# Local Supabase Development

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- Supabase CLI (`brew install supabase/tap/supabase`)

## Start the Local Stack

```bash
supabase start
```

This spins up Postgres, Auth, Storage, Realtime, and the Studio dashboard in Docker. On first run it pulls images, which takes a few minutes.

Once running, it prints output like:

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: eyJ...
service_role key: eyJ...
```

## Configure .env.local

Copy the values from `supabase start` output:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from output>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Common Commands

| Command | What it does |
|---|---|
| `supabase start` | Start all local services |
| `supabase stop` | Stop all services (keeps data) |
| `supabase stop --no-backup` | Stop and wipe all data |
| `supabase status` | Show running service URLs and keys |
| `supabase db reset` | Reset database to initial state |
| `supabase migration new <name>` | Create a new migration file |
| `supabase migration up` | Apply pending migrations |

## Studio Dashboard

Visit `http://127.0.0.1:54323` to access the Supabase Studio UI for browsing tables, running queries, and managing auth users.

## Run the App

```bash
npm run dev
```

The app connects to your local Supabase at `http://localhost:3000`.
