import {
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/supabase";

const isPlatformAdmin = sql`(SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin'`;
const callerRole = sql`(SELECT role FROM profiles WHERE user_id = auth.uid())`;
const callerOrganizationId = sql`(SELECT organization_id FROM profiles WHERE user_id = auth.uid())`;

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    systemPrompt: text("system_prompt"),
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
    pgPolicy("organization members can read own organization", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.id} = ${callerOrganizationId}`,
    }),
  ],
).enableRLS();

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id").primaryKey(),
    name: text("name"),
    role: text("role").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
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

export const practitioners = pgTable(
  "practitioners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    specialty: text("specialty"),
    licenseNumber: text("license_number"),
    npi: text("npi"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  (table) => [
    pgPolicy("platform admin can manage practitioners", {
      for: "all",
      to: authenticatedRole,
      using: isPlatformAdmin,
      withCheck: isPlatformAdmin,
    }),
    pgPolicy("organization admin can manage organization practitioners", {
      for: "all",
      to: authenticatedRole,
      using: sql`${callerRole} = 'organization_admin' AND ${table.organizationId} = ${callerOrganizationId}`,
      withCheck: sql`${callerRole} = 'organization_admin' AND ${table.organizationId} = ${callerOrganizationId}`,
    }),
    pgPolicy("practitioners can read own record", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy("organization members can read organization practitioners", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.organizationId} = ${callerOrganizationId}`,
    }),
  ],
).enableRLS();

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    practitionerId: uuid("practitioner_id").references(
      () => practitioners.id,
      { onDelete: "set null" },
    ),
    userId: uuid("user_id").unique(),
    name: text("name").notNull(),
    email: text("email"),
    dateOfBirth: date("date_of_birth").notNull(),
    gender: text("gender").notNull(),
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
    pgPolicy("organization admin can manage organization patients", {
      for: "all",
      to: authenticatedRole,
      using: sql`${callerRole} = 'organization_admin' AND ${table.organizationId} = ${callerOrganizationId}`,
      withCheck: sql`${callerRole} = 'organization_admin' AND ${table.organizationId} = ${callerOrganizationId}`,
    }),
    pgPolicy("practitioner can manage organization patients", {
      for: "all",
      to: authenticatedRole,
      using: sql`${callerRole} = 'practitioner' AND ${table.organizationId} = ${callerOrganizationId}`,
      withCheck: sql`${callerRole} = 'practitioner' AND ${table.organizationId} = ${callerOrganizationId}`,
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
    userId: uuid("user_id").unique(),
    name: text("name").notNull(),
    email: text("email"),
    relationship: text("relationship").notNull(),
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
    pgPolicy("relative can read own record", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy("organization members can manage relatives of organization patients", {
      for: "all",
      to: authenticatedRole,
      using: sql`
        ${callerRole} IN ('organization_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = ${table.patientId}
          AND p.organization_id = ${callerOrganizationId}
        )
      `,
      withCheck: sql`
        ${callerRole} IN ('organization_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = ${table.patientId}
          AND p.organization_id = ${callerOrganizationId}
        )
      `,
    }),
  ],
).enableRLS();

export const inviteCodes = pgTable(
  "invite_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    code: text("code").notNull().unique(),
    createdBy: uuid("created_by").notNull(),
    usedAt: integer("used_at"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  () => [
    pgPolicy("organization members can read invite codes they created", {
      for: "select",
      to: authenticatedRole,
      using: sql`created_by = auth.uid()`,
    }),
    pgPolicy("platform admin can manage all invite codes", {
      for: "all",
      to: authenticatedRole,
      using: isPlatformAdmin,
      withCheck: isPlatformAdmin,
    }),
  ],
).enableRLS();

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    title: text("title"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  (table) => [
    pgPolicy("users can read own conversations", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy("users can create own conversations", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = auth.uid()`,
    }),
  ],
).enableRLS();

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    toolName: text("tool_name"),
    toolInput: jsonb("tool_input"),
    toolOutput: jsonb("tool_output"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`extract(epoch from now())::integer`),
  },
  (table) => [
    pgPolicy("users can read own conversation messages", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = ${table.conversationId} AND c.user_id = auth.uid()
      )`,
    }),
    pgPolicy("users can insert own conversation messages", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = ${table.conversationId} AND c.user_id = auth.uid()
      )`,
    }),
  ],
).enableRLS();
