import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import {
  organizations,
  profiles,
  practitioners,
  patients,
  relatives,
} from "@/lib/db/schema";

const sql = postgres(process.env.DATABASE_URL!);

type CallerContext = {
  userId: string;
  role: string;
  organizationId: string | null;
};

type CallerSuccess = { ok: true; caller: CallerContext };
type CallerFailure = { ok: false; error: string };
type CallerResult = CallerSuccess | CallerFailure;

async function getCaller(): Promise<CallerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  if (!profile) {
    return { ok: false, error: "No profile found for the current user." };
  }

  return {
    ok: true,
    caller: {
      userId: user.id,
      role: profile.role,
      organizationId: profile.organizationId,
    },
  };
}

async function getPatientForCaller(
  caller: CallerContext,
): Promise<{ ok: true; patientId: string } | { ok: false; error: string }> {
  if (caller.role === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, caller.userId));
    if (!patient) {
      return {
        ok: false,
        error: "No patient record found for the current user.",
      };
    }
    return { ok: true, patientId: patient.id };
  }

  if (caller.role === "relative") {
    const [relative] = await db
      .select({ patientId: relatives.patientId })
      .from(relatives)
      .where(eq(relatives.userId, caller.userId));
    if (!relative) {
      return {
        ok: false,
        error: "No relative record found for the current user.",
      };
    }
    return { ok: true, patientId: relative.patientId };
  }

  return {
    ok: false,
    error: `Role '${caller.role}' is not permitted to perform this action.`,
  };
}

export const getMyOrganizationTool = tool({
  description:
    "Get the name and ID of the organization you belong to. Use this to answer 'what hospice am I with' or 'what's the name of my organization'.",
  inputSchema: z.object({}).optional(),
  execute: async () => {
    const result = await getCaller();
    if (!result.ok) return { error: result.error };
    const { caller } = result;

    let organizationId = caller.organizationId;

    if (!organizationId && caller.role === "relative") {
      const [relative] = await db
        .select({ patientId: relatives.patientId })
        .from(relatives)
        .where(eq(relatives.userId, caller.userId));
      if (!relative) {
        return { error: "No relative record found for the current user." };
      }
      const [patient] = await db
        .select({ organizationId: patients.organizationId })
        .from(patients)
        .where(eq(patients.id, relative.patientId));
      if (!patient) {
        return { error: "Linked patient not found." };
      }
      organizationId = patient.organizationId;
    }

    if (!organizationId) {
      return { error: "Current user is not associated with an organization." };
    }

    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return { error: "Organization not found." };
    }

    return { id: org.id, name: org.name };
  },
});

export const getMyCareTeamTool = tool({
  description:
    "Get information about the doctor/nurse caring for you (or for the patient you're linked to as a relative). Use this when the user asks about their care team.",
  inputSchema: z.object({}).optional(),
  execute: async () => {
    const result = await getCaller();
    if (!result.ok) return { error: result.error };
    const { caller } = result;

    if (caller.role !== "patient" && caller.role !== "relative") {
      return {
        error: `Role '${caller.role}' is not permitted to perform this action.`,
      };
    }

    let patientRow:
      | {
          organizationId: string;
          practitionerId: string | null;
        }
      | undefined;

    if (caller.role === "patient") {
      const [p] = await db
        .select({
          organizationId: patients.organizationId,
          practitionerId: patients.practitionerId,
        })
        .from(patients)
        .where(eq(patients.userId, caller.userId));
      patientRow = p;
      if (!patientRow) {
        return { error: "No patient record found for the current user." };
      }
    } else {
      const [relative] = await db
        .select({ patientId: relatives.patientId })
        .from(relatives)
        .where(eq(relatives.userId, caller.userId));
      if (!relative) {
        return { error: "No relative record found for the current user." };
      }
      const [p] = await db
        .select({
          organizationId: patients.organizationId,
          practitionerId: patients.practitionerId,
        })
        .from(patients)
        .where(eq(patients.id, relative.patientId));
      patientRow = p;
      if (!patientRow) {
        return { error: "Linked patient not found." };
      }
    }

    const [organization] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, patientRow.organizationId));

    let practitionerInfo: {
      id: string;
      name: string | null;
      specialty: string | null;
    } | null = null;

    if (patientRow.practitionerId) {
      const [practitioner] = await db
        .select({
          id: practitioners.id,
          userId: practitioners.userId,
          specialty: practitioners.specialty,
        })
        .from(practitioners)
        .where(eq(practitioners.id, patientRow.practitionerId));

      if (practitioner) {
        let name: string | null = null;
        try {
          const admin = createAdminClient();
          const { data } = await admin.auth.admin.getUserById(
            practitioner.userId,
          );
          name = data.user?.email ?? null;
        } catch {
          name = null;
        }

        practitionerInfo = {
          id: practitioner.id,
          name,
          specialty: practitioner.specialty,
        };
      }
    }

    return {
      practitioner: practitionerInfo,
      organization: organization
        ? { id: organization.id, name: organization.name }
        : null,
    };
  },
});

export const getMyRecentNotesTool = tool({
  description:
    "Get recent clinical notes about you (if you're a patient) or about the patient you're linked to (if you're a relative). Use this when the user asks 'what have my doctors written' or 'what's been noted recently'.",
  inputSchema: z
    .object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("How many of the most recent notes to return (max 20)."),
    })
    .optional(),
  execute: async (input?: { limit?: number }) => {
    const result = await getCaller();
    if (!result.ok) return { error: result.error };
    const { caller } = result;

    if (caller.role !== "patient" && caller.role !== "relative") {
      return {
        error: `Role '${caller.role}' is not permitted to perform this action.`,
      };
    }

    const patientLookup = await getPatientForCaller(caller);
    if (!patientLookup.ok) return { error: patientLookup.error };

    const limit = Math.min(Math.max(input?.limit ?? 5, 1), 20);

    const rows = await sql`
      select id, content, created_at
      from public.patient_notes
      where patient_id = ${patientLookup.patientId}
      order by created_at desc
      limit ${limit}
    `;

    return {
      results: rows.map((r) => ({
        id: r.id as string,
        content: r.content as string,
        created_at: r.created_at as number,
      })),
    };
  },
});

export const getMyRelativesTool = tool({
  description:
    "List family members registered as your relatives in the system. Use this when the user asks who their relatives are or who has access to their info.",
  inputSchema: z.object({}).optional(),
  execute: async () => {
    const result = await getCaller();
    if (!result.ok) return { error: result.error };
    const { caller } = result;

    if (caller.role !== "patient") {
      return {
        error: `Role '${caller.role}' is not permitted to perform this action.`,
      };
    }

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, caller.userId));

    if (!patient) {
      return { error: "No patient record found for the current user." };
    }

    const rows = await db
      .select({
        id: relatives.id,
        name: relatives.name,
        relationship: relatives.relationship,
      })
      .from(relatives)
      .where(eq(relatives.patientId, patient.id));

    return {
      results: rows.map((r) => ({
        id: r.id,
        name: r.name,
        relationship: r.relationship,
      })),
    };
  },
});
