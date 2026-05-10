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

async function authorizeOrgAccess(
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

  return {
    ok: true,
    userId: user.id,
    role: profile.role,
    organizationId: profile.organizationId,
  };
}

async function authorizePatientAccess(
  patientId: string,
  allowedRoles: ReadonlyArray<"practitioner" | "organization_admin">,
): Promise<AuthResult> {
  const auth = await authorizeOrgAccess(allowedRoles);
  if (!auth.ok) return auth;

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient) {
    return { ok: false, error: "Patient not found." };
  }

  if (patient.organizationId !== auth.organizationId) {
    return {
      ok: false,
      error: "Patient is not in the caller's organization.",
    };
  }

  return auth;
}

function clampLimit(value: number | undefined, fallback: number, max: number) {
  const n = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(Math.max(Math.trunc(n) || fallback, 1), max);
}

export const searchOrgNotesTool = tool({
  description:
    "Search clinical notes ACROSS ALL patients in your organization by meaning. Use this for broad questions like 'which patients have been mentioning chest pain this month' — NOT when the question is about one specific named patient (use searchPatientNotes for that).",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "The free-text question used to semantically search notes across the organization.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe("How many results to return (default 10, max 20)."),
  }),
  execute: async (input: { query: string; limit?: number }) => {
    const auth = await authorizeOrgAccess([
      "practitioner",
      "organization_admin",
    ]);
    if (!auth.ok) return { error: auth.error };

    const trimmed = input.query.trim();
    if (!trimmed) {
      return { results: [] as Array<never> };
    }

    const limit = clampLimit(input.limit, 10, 20);

    const embedding = await embedText(trimmed);
    const vec = vectorLiteral(embedding);

    const rows = await sql`
      select
        n.id as note_id,
        n.patient_id,
        p.name as patient_name,
        n.content,
        n.created_at,
        1 - (n.embedding <=> ${vec}::vector) as similarity
      from public.patient_notes n
      join public.patients p on p.id = n.patient_id
      where n.organization_id = ${auth.organizationId}
        and n.embedding is not null
      order by n.embedding <=> ${vec}::vector
      limit ${limit}
    `;

    return {
      results: rows.map((r) => ({
        note_id: r.note_id as string,
        patient_id: r.patient_id as string,
        patient_name: r.patient_name as string,
        content: r.content as string,
        similarity: Number(r.similarity),
        created_at: (r.created_at instanceof Date
          ? r.created_at.toISOString()
          : (r.created_at as string)),
      })),
    };
  },
});

export const searchPatientNotesByDateTool = tool({
  description:
    "Search a single patient's clinical notes within an optional date range. Use this when the practitioner asks about 'this week', 'since the medication change', or any time-bounded query.",
  inputSchema: z.object({
    patientId: z
      .string()
      .uuid()
      .describe("The UUID of the patient whose notes should be searched."),
    query: z
      .string()
      .min(1)
      .describe(
        "The free-text question used to semantically search the patient's notes.",
      ),
    since: z
      .string()
      .datetime()
      .optional()
      .describe(
        "Optional ISO 8601 datetime (inclusive lower bound) for note created_at.",
      ),
    until: z
      .string()
      .datetime()
      .optional()
      .describe(
        "Optional ISO 8601 datetime (inclusive upper bound) for note created_at.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe("How many results to return (default 10, max 20)."),
  }),
  execute: async (input: {
    patientId: string;
    query: string;
    since?: string;
    until?: string;
    limit?: number;
  }) => {
    const auth = await authorizePatientAccess(input.patientId, [
      "practitioner",
      "organization_admin",
    ]);
    if (!auth.ok) return { error: auth.error };

    const trimmed = input.query.trim();
    if (!trimmed) {
      return {
        results: [] as Array<never>,
        filter: { since: input.since ?? null, until: input.until ?? null },
      };
    }

    const limit = clampLimit(input.limit, 10, 20);

    // patient_notes.created_at is timestamptz; pass ISO strings and cast.
    const since = input.since ?? null;
    const until = input.until ?? null;

    if (since !== null && Number.isNaN(new Date(since).getTime())) {
      return { error: "Invalid 'since' date." };
    }
    if (until !== null && Number.isNaN(new Date(until).getTime())) {
      return { error: "Invalid 'until' date." };
    }

    const embedding = await embedText(trimmed);
    const vec = vectorLiteral(embedding);

    const rows = await sql`
      select
        n.id as note_id,
        n.patient_id,
        p.name as patient_name,
        n.content,
        n.created_at,
        1 - (n.embedding <=> ${vec}::vector) as similarity
      from public.patient_notes n
      join public.patients p on p.id = n.patient_id
      where n.patient_id = ${input.patientId}
        and n.organization_id = ${auth.organizationId}
        and n.embedding is not null
        and (${since}::timestamptz is null or n.created_at >= ${since}::timestamptz)
        and (${until}::timestamptz is null or n.created_at <= ${until}::timestamptz)
      order by n.embedding <=> ${vec}::vector
      limit ${limit}
    `;

    return {
      results: rows.map((r) => ({
        note_id: r.note_id as string,
        patient_id: r.patient_id as string,
        patient_name: r.patient_name as string,
        content: r.content as string,
        similarity: Number(r.similarity),
        created_at: (r.created_at instanceof Date
          ? r.created_at.toISOString()
          : (r.created_at as string)),
      })),
      filter: {
        since: input.since ?? null,
        until: input.until ?? null,
      },
    };
  },
});

export const recentOrgActivityTool = tool({
  description:
    "List the most recent clinical notes across all patients in your organization. Use for questions like 'what happened today' or 'show me what's new'.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(10)
      .describe("How many recent notes to return (default 10, max 30)."),
  }),
  execute: async (input: { limit?: number }) => {
    const auth = await authorizeOrgAccess([
      "practitioner",
      "organization_admin",
    ]);
    if (!auth.ok) return { error: auth.error };

    const limit = clampLimit(input.limit, 10, 30);

    const rows = await sql`
      select
        n.id as note_id,
        n.patient_id,
        p.name as patient_name,
        n.author_id,
        n.content,
        n.created_at
      from public.patient_notes n
      join public.patients p on p.id = n.patient_id
      where n.organization_id = ${auth.organizationId}
      order by n.created_at desc
      limit ${limit}
    `;

    return {
      results: rows.map((r) => ({
        note_id: r.note_id as string,
        patient_id: r.patient_id as string,
        patient_name: r.patient_name as string,
        author_id: r.author_id as string,
        content: r.content as string,
        created_at: (r.created_at instanceof Date
          ? r.created_at.toISOString()
          : (r.created_at as string)),
      })),
    };
  },
});
