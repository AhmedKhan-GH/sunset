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
   SUPABASE_SERVICE_ROLE_KEY=<Secret key>
   ```
5. Run database migrations and seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
6. Start the app:
   ```bash
   npm run dev
   ```
7. Open [http://localhost:3000](http://localhost:3000) and sign in with `admin@sunset.dev` / `admin123`

## Database Workflow

Schema is defined in `lib/db/schema.ts` using Drizzle ORM. To make changes:

1. Edit `lib/db/schema.ts`
2. Generate a migration:
   ```bash
   npm run db:generate
   ```
3. Apply the migration:
   ```bash
   npm run db:migrate
   ```

Migration files are committed to `./drizzle/` and applied in order.

### Resetting the Database

To start fresh:

```bash
npx supabase db reset
npm run db:migrate
npm run db:seed
```

## Tests

```bash
npm run test:run
```
