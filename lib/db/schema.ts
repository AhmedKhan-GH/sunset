import {
  integer,
  pgPolicy,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/supabase";

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id").primaryKey(),
    role: text("role").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  (table) => [
    pgPolicy("users can read own profile", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
  ],
).enableRLS();

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  (table) => [
    pgPolicy("platform admin can manage orgs", {
      for: "all",
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin'`,
    }),
  ],
).enableRLS();
