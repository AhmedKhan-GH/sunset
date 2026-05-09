# Sunset

AI-powered hospice care platform.

## Quick Start

1. Make sure **Docker Desktop** is running
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local Supabase stack:
   ```bash
   npx supabase start
   ```
4. Copy the keys from the output into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   ```
5. Run database migrations:
   ```bash
   npx drizzle-kit migrate
   ```
6. Seed the platform admin (get the Secret key from `npx supabase status`):
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<Secret key> npx tsx lib/db/seed.ts
   ```
7. Start the app:
   ```bash
   npm run dev
   ```
8. Open [http://localhost:3000](http://localhost:3000) and sign in with `admin@sunset.dev` / `admin123`

## Database Workflow

Schema is defined in `lib/db/schema.ts` using Drizzle ORM. To make changes:

1. Edit `lib/db/schema.ts`
2. Generate a migration:
   ```bash
   npx drizzle-kit generate
   ```
3. Apply the migration:
   ```bash
   npx drizzle-kit migrate
   ```

Migration files are committed to `./drizzle/` and applied in order.

### Resetting the Database

To start fresh:

```bash
npx supabase db reset
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npx drizzle-kit migrate
SUPABASE_SERVICE_ROLE_KEY=<Secret key> npx tsx lib/db/seed.ts
```

## Tests

```bash
npm run test:run
```
