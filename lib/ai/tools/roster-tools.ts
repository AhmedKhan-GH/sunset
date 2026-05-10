import { tool } from "ai";
import { z } from "zod";
import { and, eq, ilike } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import {
  profiles,
  practitioners,
  patients,
  relatives,
} from "@/lib/db/schema";

type CallerProfileResult =
  | { profile: typeof profiles.$inferSelect }
  | { error: string };

/**
 * Resolve the calling user's profile.
 * Returns either { profile } or { error } — never throws.
 */
async function getCallerProfile(): Promise<CallerProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  if (!profile) {
    return { error: "No profile found for current user." };
  }

  return { profile };
}

type OrgStaff = {
  profile: typeof profiles.$inferSelect;
  organizationId: string;
};

async function requireOrgStaff(): Promise<OrgStaff | { error: string }> {
  const result = await getCallerProfile();
  if ("error" in result) return { error: result.error };

  const { profile } = result;
  if (!["organization_admin", "practitioner"].includes(profile.role)) {
    return {
      error:
        "Forbidden — only organization admins and practitioners may use this tool.",
    };
  }
  const organizationId = profile.organizationId;
  if (!organizationId) {
    return { error: "Caller has no organization." };
  }
  return { profile, organizationId };
}

/**
 * Build a userId -> display name (or email) map by listing auth users via the
 * service-role admin client. Mirrors the pattern in app/organization/actions.ts.
 */
async function buildUserDisplayNameMap(): Promise<Record<string, string>> {
  try {
    const admin = createAdminClient();
    const {
      data: { users },
    } = await admin.auth.admin.listUsers();
    return Object.fromEntries(
      users.map((u) => {
        const meta = (u.user_metadata ?? {}) as {
          full_name?: string;
          name?: string;
        };
        const display = meta.full_name ?? meta.name ?? u.email ?? "";
        return [u.id, display];
      }),
    );
  } catch {
    return {};
  }
}

export const listMyPatientsTool = tool({
  description:
    "List all patients in your organization. Use this to answer 'who are my patients' or 'how many patients do we have'.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .positive()
      .max(500)
      .optional()
      .describe("Maximum number of patients to return. Defaults to 50."),
  }),
  execute: async (input: { limit?: number }) => {
    const auth = await requireOrgStaff();
    if ("error" in auth) return { error: auth.error };

    const cap = input.limit ?? 50;
    const rows = await db
      .select({
        id: patients.id,
        name: patients.name,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
      })
      .from(patients)
      .where(eq(patients.organizationId, auth.organizationId))
      .limit(cap);

    return { patients: rows, count: rows.length };
  },
});

export const findPatientByNameTool = tool({
  description:
    "Find patients by partial name match. Use this when the practitioner mentions a patient by name and you need their patient ID for further queries.",
  inputSchema: z.object({
    name: z
      .string()
      .min(1)
      .describe("Partial or full patient name. Case-insensitive."),
  }),
  execute: async (input: { name: string }) => {
    const auth = await requireOrgStaff();
    if ("error" in auth) return { error: auth.error };

    const rows = await db
      .select({
        id: patients.id,
        name: patients.name,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
      })
      .from(patients)
      .where(
        and(
          eq(patients.organizationId, auth.organizationId),
          ilike(patients.name, `%${input.name}%`),
        ),
      )
      .limit(10);

    return { patients: rows, count: rows.length };
  },
});

export const getPatientDetailsTool = tool({
  description:
    "Get a single patient's demographics, assigned practitioner, and family members. Use this when the practitioner asks about a specific patient's basic info or family situation.",
  inputSchema: z.object({
    patientId: z.string().uuid().describe("The patient's UUID."),
  }),
  execute: async (input: { patientId: string }) => {
    const auth = await requireOrgStaff();
    if ("error" in auth) return { error: auth.error };

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, input.patientId));

    if (!patient) {
      return { error: "Patient not found." };
    }
    if (patient.organizationId !== auth.organizationId) {
      return { error: "Patient is not in your organization." };
    }

    let assignedPractitionerName: string | null = null;
    if (patient.practitionerId) {
      const [practitioner] = await db
        .select()
        .from(practitioners)
        .where(eq(practitioners.id, patient.practitionerId));

      if (practitioner) {
        const nameMap = await buildUserDisplayNameMap();
        assignedPractitionerName = nameMap[practitioner.userId] ?? null;
      }
    }

    const rels = await db
      .select({
        name: relatives.name,
        relationship: relatives.relationship,
      })
      .from(relatives)
      .where(eq(relatives.patientId, input.patientId));

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        dob: patient.dateOfBirth,
        gender: patient.gender,
        assigned_practitioner_name: assignedPractitionerName,
      },
      relatives: rels,
    };
  },
});

export const listOrganizationPractitionersTool = tool({
  description:
    "List practitioners (doctors and nurses) in your organization. Use this to answer 'who's on the care team'.",
  inputSchema: z.object({}),
  execute: async () => {
    const auth = await getCallerProfile();
    if ("error" in auth) return { error: auth.error };

    const organizationId = auth.profile.organizationId;
    if (!organizationId) {
      return { error: "Caller has no organization." };
    }

    const rows = await db
      .select({
        id: practitioners.id,
        userId: practitioners.userId,
        specialty: practitioners.specialty,
        licenseNumber: practitioners.licenseNumber,
      })
      .from(practitioners)
      .where(eq(practitioners.organizationId, organizationId));

    const nameMap = await buildUserDisplayNameMap();

    const enriched = rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      specialty: p.specialty,
      licenseNumber: p.licenseNumber,
      name: nameMap[p.userId] ?? "",
    }));

    return { practitioners: enriched, count: enriched.length };
  },
});
