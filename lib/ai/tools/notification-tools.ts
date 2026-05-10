import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import {
  profiles,
  practitioners,
  patients,
  relatives,
} from "@/lib/db/schema";

const sql = postgres(process.env.DATABASE_URL!);

type Urgency = "low" | "normal" | "high" | "urgent";

const urgencySchema = z
  .enum(["low", "normal", "high", "urgent"])
  .default("normal")
  .describe(
    "Severity of the notification. Default 'normal'. Use 'urgent' only for situations needing immediate attention.",
  );

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

/** Look up the patient row for a patient/relative caller. */
async function resolvePatientForCaller(
  caller: CallerContext,
): Promise<
  | { ok: true; patient: typeof patients.$inferSelect; relativeName?: string; relativeRelationship?: string }
  | { ok: false; error: string }
> {
  if (caller.role === "patient") {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, caller.userId));
    if (!patient) {
      return { ok: false, error: "No patient record found for the current user." };
    }
    return { ok: true, patient };
  }

  if (caller.role === "relative") {
    const [relative] = await db
      .select()
      .from(relatives)
      .where(eq(relatives.userId, caller.userId));
    if (!relative) {
      return { ok: false, error: "No relative record found for the current user." };
    }
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, relative.patientId));
    if (!patient) {
      return { ok: false, error: "Linked patient not found." };
    }
    return {
      ok: true,
      patient,
      relativeName: relative.name,
      relativeRelationship: relative.relationship,
    };
  }

  return {
    ok: false,
    error: `Role '${caller.role}' cannot derive a patient implicitly.`,
  };
}

/** Build a sender label that best identifies a patient/relative caller. */
function buildPatientFamilyLabel(
  caller: CallerContext,
  patient: typeof patients.$inferSelect,
  relative?: { name: string; relationship: string },
): string {
  if (caller.role === "patient") {
    return `${patient.name} (patient)`;
  }
  if (caller.role === "relative" && relative) {
    return `${relative.name} (${relative.relationship} of ${patient.name})`;
  }
  return "Family";
}

/** Sender label for a practitioner caller — prefer specialty, fall back. */
async function buildPractitionerLabel(userId: string): Promise<string> {
  const [practitioner] = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.userId, userId));

  if (practitioner?.specialty && practitioner.specialty.trim()) {
    return practitioner.specialty.trim();
  }
  return "Practitioner";
}

/** Insert a single notification row through the privileged client so the
 * shape of the row is fully under our control regardless of which RLS
 * policy applied to the calling user. Returns the inserted id or null. */
async function insertNotification(row: {
  recipient_id: string;
  sender_id: string | null;
  sender_label: string;
  patient_id: string | null;
  title: string;
  body: string;
  urgency: Urgency;
}): Promise<string | null> {
  const rows = await sql`
    insert into public.notifications
      (recipient_id, sender_id, sender_label, patient_id, title, body, urgency)
    values
      (${row.recipient_id}, ${row.sender_id}, ${row.sender_label},
       ${row.patient_id}, ${row.title}, ${row.body}, ${row.urgency})
    returning id
  `;
  return (rows[0]?.id as string) ?? null;
}

/** Look up the auth.users.id of the practitioner assigned to a patient. */
async function getAssignedPractitionerUserId(
  patient: typeof patients.$inferSelect,
): Promise<string | null> {
  if (!patient.practitionerId) return null;
  const [practitioner] = await db
    .select({ userId: practitioners.userId })
    .from(practitioners)
    .where(eq(practitioners.id, patient.practitionerId));
  return practitioner?.userId ?? null;
}

/** Relatives that have signed up for portal access (have a userId). */
async function getRelativeUserIds(patientId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: relatives.userId })
    .from(relatives)
    .where(eq(relatives.patientId, patientId));
  return rows
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));
}

// ---------------------------------------------------------------------------
// pingPractitionerTool
// ---------------------------------------------------------------------------
export const pingPractitionerTool = tool({
  description:
    "Send a notification to the patient's assigned practitioner. Use when the patient or family wants the doctor's attention but doesn't need to send a full message.",
  inputSchema: z.object({
    title: z.string().min(1).describe("Short headline for the notification."),
    body: z.string().min(1).describe("Body text for the notification."),
    urgency: urgencySchema,
  }),
  execute: async (input: { title: string; body: string; urgency?: Urgency }) => {
    const result = await getCaller();
    if (!result.ok) return { error: result.error };
    const { caller } = result;

    if (caller.role !== "patient" && caller.role !== "relative") {
      return {
        error: `Role '${caller.role}' is not permitted to ping a practitioner.`,
      };
    }

    const resolved = await resolvePatientForCaller(caller);
    if (!resolved.ok) return { error: resolved.error };
    const { patient } = resolved;

    const practitionerUserId = await getAssignedPractitionerUserId(patient);
    if (!practitionerUserId) {
      return {
        error:
          "This patient has no assigned practitioner. Notify the organization admin instead.",
      };
    }

    const senderLabel = buildPatientFamilyLabel(
      caller,
      patient,
      resolved.relativeName && resolved.relativeRelationship
        ? {
            name: resolved.relativeName,
            relationship: resolved.relativeRelationship,
          }
        : undefined,
    );

    const id = await insertNotification({
      recipient_id: practitionerUserId,
      sender_id: caller.userId,
      sender_label: senderLabel,
      patient_id: patient.id,
      title: input.title.trim(),
      body: input.body.trim(),
      urgency: input.urgency ?? "normal",
    });

    if (!id) {
      return { error: "Failed to send notification." };
    }
    return { id, recipientCount: 1 };
  },
});

// ---------------------------------------------------------------------------
// pingRelativesTool
// ---------------------------------------------------------------------------
export const pingRelativesTool = tool({
  description:
    "Notify all of a patient's registered relatives. Use when a clinical update needs to reach the family.",
  inputSchema: z.object({
    patientId: z.string().uuid().describe("UUID of the patient whose family to notify."),
    title: z.string().min(1).describe("Short headline for the notification."),
    body: z.string().min(1).describe("Body text for the notification."),
    urgency: urgencySchema,
  }),
  execute: async (input: {
    patientId: string;
    title: string;
    body: string;
    urgency?: Urgency;
  }) => {
    const result = await getCaller();
    if (!result.ok) return { error: result.error };
    const { caller } = result;

    if (caller.role !== "practitioner") {
      return {
        error: `Role '${caller.role}' is not permitted to ping relatives.`,
      };
    }

    if (!caller.organizationId) {
      return { error: "Caller has no organization." };
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, input.patientId));

    if (!patient) {
      return { error: "Patient not found." };
    }
    if (patient.organizationId !== caller.organizationId) {
      return { error: "Patient is not in your organization." };
    }

    const relativeUserIds = await getRelativeUserIds(patient.id);
    if (relativeUserIds.length === 0) {
      return {
        error:
          "No relatives with portal access are registered for this patient.",
        recipientCount: 0,
      };
    }

    const senderLabel = await buildPractitionerLabel(caller.userId);

    let sent = 0;
    for (const recipientId of relativeUserIds) {
      const id = await insertNotification({
        recipient_id: recipientId,
        sender_id: caller.userId,
        sender_label: senderLabel,
        patient_id: patient.id,
        title: input.title.trim(),
        body: input.body.trim(),
        urgency: input.urgency ?? "normal",
      });
      if (id) sent += 1;
    }

    return { recipientCount: sent };
  },
});

// ---------------------------------------------------------------------------
// pingCareTeamTool
// ---------------------------------------------------------------------------
export const pingCareTeamTool = tool({
  description:
    "Send an urgent notification to the entire care team — the assigned practitioner plus all relatives. Use this when a check-in or message indicates a worsening situation that needs everyone's attention immediately.",
  inputSchema: z.object({
    patientId: z
      .string()
      .uuid()
      .optional()
      .describe(
        "Patient UUID. Required when called by a practitioner; for patients/relatives this is derived from the caller.",
      ),
    title: z.string().min(1).describe("Short headline for the notification."),
    body: z.string().min(1).describe("Body text for the notification."),
    urgency: urgencySchema,
  }),
  execute: async (input: {
    patientId?: string;
    title: string;
    body: string;
    urgency?: Urgency;
  }) => {
    const result = await getCaller();
    if (!result.ok) return { error: result.error };
    const { caller } = result;

    if (
      caller.role !== "patient" &&
      caller.role !== "relative" &&
      caller.role !== "practitioner"
    ) {
      return {
        error: `Role '${caller.role}' is not permitted to ping the care team.`,
      };
    }

    // Resolve target patient + sender label.
    let patient: typeof patients.$inferSelect | undefined;
    let senderLabel = "";

    if (caller.role === "practitioner") {
      if (!input.patientId) {
        return {
          error: "patientId is required when called by a practitioner.",
        };
      }
      if (!caller.organizationId) {
        return { error: "Caller has no organization." };
      }
      const [row] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, input.patientId));
      if (!row) return { error: "Patient not found." };
      if (row.organizationId !== caller.organizationId) {
        return { error: "Patient is not in your organization." };
      }
      patient = row;
      senderLabel = await buildPractitionerLabel(caller.userId);
    } else {
      // patient or relative
      const resolved = await resolvePatientForCaller(caller);
      if (!resolved.ok) return { error: resolved.error };
      patient = resolved.patient;

      // If a patientId was supplied, make sure it matches the derived one.
      if (input.patientId && input.patientId !== patient.id) {
        return {
          error:
            "You can only ping the care team for the patient you are linked to.",
        };
      }

      senderLabel = buildPatientFamilyLabel(
        caller,
        patient,
        resolved.relativeName && resolved.relativeRelationship
          ? {
              name: resolved.relativeName,
              relationship: resolved.relativeRelationship,
            }
          : undefined,
      );
    }

    if (!patient) {
      return { error: "Could not resolve patient." };
    }

    // Build recipient set: assigned practitioner + relatives with portal access.
    const recipients = new Set<string>();
    const practitionerUserId = await getAssignedPractitionerUserId(patient);
    if (practitionerUserId && practitionerUserId !== caller.userId) {
      recipients.add(practitionerUserId);
    }
    const relativeUserIds = await getRelativeUserIds(patient.id);
    for (const id of relativeUserIds) {
      if (id !== caller.userId) recipients.add(id);
    }

    if (recipients.size === 0) {
      return {
        error:
          "No reachable care-team members. The patient has no assigned practitioner and no relatives with portal access.",
        recipientCount: 0,
      };
    }

    const urgency: Urgency = input.urgency ?? "high";

    let sent = 0;
    for (const recipientId of recipients) {
      const id = await insertNotification({
        recipient_id: recipientId,
        sender_id: caller.role === "practitioner" ? caller.userId : caller.userId,
        sender_label: senderLabel,
        patient_id: patient.id,
        title: input.title.trim(),
        body: input.body.trim(),
        urgency,
      });
      if (id) sent += 1;
    }

    // Best-effort: hint the integrator at who got pinged. Keep degraded
    // behavior if the admin client isn't configured.
    let recipientEmails: string[] = [];
    try {
      const admin = createAdminClient();
      const lookups = await Promise.all(
        Array.from(recipients).map((id) => admin.auth.admin.getUserById(id)),
      );
      recipientEmails = lookups
        .map((l) => l.data.user?.email ?? null)
        .filter((e): e is string => Boolean(e));
    } catch {
      recipientEmails = [];
    }

    return {
      recipientCount: sent,
      recipientEmails,
    };
  },
});
