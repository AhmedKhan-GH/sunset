import { integer, pgPolicy, pgTable, text, uuid, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/supabase";

const isPlatformAdmin = sql`(SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin'`;
const callerRole = sql`(SELECT role FROM profiles WHERE user_id = auth.uid())`;
const callerOrgId = sql`(SELECT org_id FROM profiles WHERE user_id = auth.uid())`;

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
      using: isPlatformAdmin,
      withCheck: isPlatformAdmin,
    }),
    pgPolicy("org members can read own org", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.id} = ${callerOrgId}`,
    }),
  ],
).enableRLS();

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id").primaryKey(),
    role: text("role").notNull(), // platform_admin | org_admin | practitioner
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
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
    pgPolicy("platform admin can manage profiles", {
      for: "all",
      to: authenticatedRole,
      using: isPlatformAdmin,
      withCheck: isPlatformAdmin,
    }),
    pgPolicy("org admin can manage profiles in own org", {
      for: "all",
      to: authenticatedRole,
      using: sql`${callerRole} = 'org_admin' AND ${table.orgId} = ${callerOrgId}`,
      withCheck: sql`${callerRole} = 'org_admin' AND ${table.orgId} = ${callerOrgId}`,
    }),
  ],
).enableRLS();

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    practitionerId: uuid("practitioner_id").references(() => profiles.userId, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").unique(), // auth user for patient portal login
    name: text("name").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    gender: text("gender").notNull(), // male | female | other | unknown
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  (table) => [
    pgPolicy("platform admin can manage patients", {
      for: "all",
      to: authenticatedRole,
      using: isPlatformAdmin,
      withCheck: isPlatformAdmin,
    }),
    pgPolicy("org admin can manage org patients", {
      for: "all",
      to: authenticatedRole,
      using: sql`${callerRole} = 'org_admin' AND ${table.orgId} = ${callerOrgId}`,
      withCheck: sql`${callerRole} = 'org_admin' AND ${table.orgId} = ${callerOrgId}`,
    }),
    pgPolicy("practitioner can manage org patients", {
      for: "all",
      to: authenticatedRole,
      using: sql`${callerRole} = 'practitioner' AND ${table.orgId} = ${callerOrgId}`,
      withCheck: sql`${callerRole} = 'practitioner' AND ${table.orgId} = ${callerOrgId}`,
    }),
    pgPolicy("patient can read own record", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
  ],
).enableRLS();

export const relatives = pgTable(
  "relatives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relationship: text("relationship").notNull(), // spouse | child | parent | sibling | other
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  (table) => [
    pgPolicy("platform admin can manage relatives", {
      for: "all",
      to: authenticatedRole,
      using: isPlatformAdmin,
      withCheck: isPlatformAdmin,
    }),
    pgPolicy("patient can manage own relatives", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = ${table.patientId} AND p.user_id = auth.uid()
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = ${table.patientId} AND p.user_id = auth.uid()
      )`,
    }),
    pgPolicy("org members can manage relatives of org patients", {
      for: "all",
      to: authenticatedRole,
      using: sql`
        ${callerRole} IN ('org_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = ${table.patientId}
          AND p.org_id = ${callerOrgId}
        )
      `,
      withCheck: sql`
        ${callerRole} IN ('org_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = ${table.patientId}
          AND p.org_id = ${callerOrgId}
        )
      `,
    }),
  ],
).enableRLS();
