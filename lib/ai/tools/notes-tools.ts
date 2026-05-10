import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, patients } from "@/lib/db/schema";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

const sql = postgres(process.env.DATABASE_URL!);

type AuthSuccess = {
  ok: true;
  userId: string;
  role: string;
  organizationId: string;
};

type AuthFailure = {
  ok: false;
  error: string;
};

type AuthResult = AuthSuccess | AuthFailure;

async function authorizeNoteAccess(
  patientId: string,
  allowedRoles: ReadonlyArray<"practitioner" | "organization_admin">,
): Promise<AuthResult> {
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

  if (!profile.organizationId) {
    return {
      ok: false,
      error: "Current user is not associated with an organization.",
    };
  }

  if (!allowedRoles.includes(profile.role as (typeof allowedRoles)[number])) {
    return {
      ok: false,
      error: `Role '${profile.role}' is not permitted to perform this action.`,
    };
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient) {
    return { ok: false, error: "Patient not found." };
  }

  if (patient.organizationId !== profile.organizationId) {
    return {
      ok: false,
      error: "Patient is not in the caller's organization.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    role: profile.role,
    organizationId: profile.organizationId,
  };
}

export const searchPatientNotesTool = tool({
  description:
    "Search a specific patient's clinical notes by meaning. Use this when the practitioner asks about symptoms, history, or anything specific to one patient.",
  inputSchema: z.object({
    patientId: z
      .string()
      .uuid()
      .describe("The UUID of the patient whose notes should be searched."),
    query: z
      .string()
      .min(1)
      .describe(
        "The practitioner's free-text question used to semantically search the notes.",
      ),
  }),
  execute: async (input: { patientId: string; query: string }) => {
    const auth = await authorizeNoteAccess(input.patientId, [
      "practitioner",
      "organization_admin",
    ]);
    if (!auth.ok) return { error: auth.error };

    const trimmed = input.query.trim();
    if (!trimmed) {
      return { results: [] as Array<never> };
    }

    const embedding = await embedText(trimmed);
    const vec = vectorLiteral(embedding);

    const rows = await sql`
      select
        id,
        content,
        created_at,
        1 - (embedding <=> ${vec}::vector) as similarity
      from public.patient_notes
      where patient_id = ${input.patientId}
        and organization_id = ${auth.organizationId}
        and embedding is not null
      order by embedding <=> ${vec}::vector
      limit 5
    `;

    return {
      results: rows.map((r) => ({
        id: r.id as string,
        content: r.content as string,
        createdAt: r.created_at as number,
        similarity: Number(r.similarity),
      })),
    };
  },
});

export const recentPatientNotesTool = tool({
  description:
    "Get the most recent clinical notes for a patient in chronological order. Use this when the practitioner wants a timeline rather than a search.",
  inputSchema: z.object({
    patientId: z
      .string()
      .uuid()
      .describe("The UUID of the patient whose notes should be returned."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("How many of the most recent notes to return (max 20)."),
  }),
  execute: async (input: { patientId: string; limit: number }) => {
    const auth = await authorizeNoteAccess(input.patientId, [
      "practitioner",
      "organization_admin",
    ]);
    if (!auth.ok) return { error: auth.error };

    const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

    const rows = await sql`
      select id, content, created_at
      from public.patient_notes
      where patient_id = ${input.patientId}
        and organization_id = ${auth.organizationId}
      order by created_at desc
      limit ${limit}
    `;

    return {
      results: rows.map((r) => ({
        id: r.id as string,
        content: r.content as string,
        createdAt: r.created_at as number,
      })),
    };
  },
});

export const addPatientNoteTool = tool({
  description:
    "Add a new clinical note to a patient's record. Only use this when the practitioner explicitly asks to record an observation.",
  inputSchema: z.object({
    patientId: z
      .string()
      .uuid()
      .describe("The UUID of the patient the note should be attached to."),
    content: z
      .string()
      .min(1)
      .describe("The clinical note content to record."),
  }),
  execute: async (input: { patientId: string; content: string }) => {
    const auth = await authorizeNoteAccess(input.patientId, ["practitioner"]);
    if (!auth.ok) return { error: auth.error };

    const trimmed = input.content.trim();
    if (!trimmed) {
      return { error: "Note content cannot be empty." };
    }

    const embedding = await embedText(trimmed);
    const vec = vectorLiteral(embedding);

    const rows = await sql`
      insert into public.patient_notes
        (organization_id, patient_id, author_id, content, embedding)
      values
        (${auth.organizationId}, ${input.patientId}, ${auth.userId}, ${trimmed}, ${vec}::vector)
      returning id
    `;

    const inserted = rows[0];
    if (!inserted) {
      return { error: "Failed to insert note." };
    }

    return { id: inserted.id as string };
  },
});
