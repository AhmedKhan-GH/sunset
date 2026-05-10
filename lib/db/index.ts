import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Cache the postgres client across hot-reloads in dev. Without this, every
// edit creates a fresh module instance + a fresh pool of 10 connections,
// piling up until Postgres rejects new ones with code 53300
// ("remaining connection slots are reserved for roles with the SUPERUSER
// attribute"). Production cold starts also benefit from a smaller pool.
const globalForPostgres = globalThis as unknown as {
  __sunset_pg?: ReturnType<typeof postgres>;
};

const client =
  globalForPostgres.__sunset_pg ??
  postgres(process.env.DATABASE_URL!, {
    // Keep the pool small. Dev typically needs 2-3 concurrent queries; the
    // rest are wasted slots that Postgres has to reserve.
    max: 5,
    idle_timeout: 20, // seconds
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.__sunset_pg = client;
}

export const db = drizzle(client, { schema });
export const sql = client;
