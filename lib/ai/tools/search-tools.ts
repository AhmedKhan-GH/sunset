import { tool } from "ai";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getCallerContext } from "@/lib/ai/auth";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

export const searchNotesTool = tool({
  description: [
    "Semantic search over clinical notes. Returns notes ranked by meaning-similarity to the query.",
    "Scoping is automatic: practitioners/admins search org-wide (or one patient if patientId given),",
    "patients/relatives only see their own notes.",
    "Use for questions about symptoms, history, patterns, or any meaning-based lookup.",
  ].join(" "),
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe("Free-text search query — will be embedded for semantic matching."),
    patientId: z
      .string()
      .uuid()
      .optional()
      .describe("Optional: scope results to a single patient. Ignored for patient/relative callers."),
    since: z
      .string()
      .datetime()
      .optional()
      .describe("Optional ISO 8601 lower bound on note created_at."),
    until: z
      .string()
      .datetime()
      .optional()
      .describe("Optional ISO 8601 upper bound on note created_at."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe("Max results to return (default 10, max 20)."),
  }),
  execute: async (input) => {
    const auth = await getCallerContext();
    if (!auth.ok) return { error: auth.error };

    const { caller } = auth;
    const trimmed = input.query.trim();
    if (!trimmed) return { results: [] };

    const effectivePatientId =
      caller.patientId ?? input.patientId ?? null;

    const limit = Math.min(Math.max(input.limit ?? 10, 1), 20);

    const embedding = await embedText(trimmed);
    const vec = vectorLiteral(embedding);

    const patientFilter = effectivePatientId
      ? sql`and n.patient_id = ${effectivePatientId}`
      : sql``;

    const sinceFilter = input.since
      ? sql`and n.created_at >= ${input.since}::timestamptz`
      : sql``;

    const untilFilter = input.until
      ? sql`and n.created_at <= ${input.until}::timestamptz`
      : sql``;

    const rows = await sql`
      select
        n.id as note_id,
        n.patient_id,
        p.name as patient_name,
        pr.name as author_name,
        n.content,
        n.created_at,
        1 - (n.embedding <=> ${vec}::vector) as similarity
      from public.patient_notes n
      join public.patients p on p.id = n.patient_id
      left join public.profiles pr on pr.user_id = n.author_id
      where n.organization_id = ${caller.organizationId}
        and n.embedding is not null
        ${patientFilter}
        ${sinceFilter}
        ${untilFilter}
      order by n.embedding <=> ${vec}::vector
      limit ${limit}
    `;

    return {
      results: rows.map((r) => ({
        noteId: r.note_id as string,
        patientId: r.patient_id as string,
        patientName: r.patient_name as string,
        authorName: (r.author_name as string) ?? "Unknown",
        content: r.content as string,
        similarity: Number(r.similarity),
        createdAt: r.created_at instanceof Date
          ? r.created_at.toISOString()
          : (r.created_at as string),
      })),
    };
  },
});

export const recentNotesTool = tool({
  description: [
    "Get the most recent clinical notes in chronological order.",
    "Use for 'what happened today', 'show me what's new', or timeline views.",
    "Same scoping rules as searchNotes: practitioners/admins see org-wide, patients/relatives see their own.",
  ].join(" "),
  inputSchema: z.object({
    patientId: z
      .string()
      .uuid()
      .optional()
      .describe("Optional: scope to a single patient."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(10)
      .describe("How many recent notes to return (default 10, max 30)."),
  }),
  execute: async (input) => {
    const auth = await getCallerContext();
    if (!auth.ok) return { error: auth.error };

    const { caller } = auth;
    const effectivePatientId = caller.patientId ?? input.patientId ?? null;
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 30);

    const patientFilter = effectivePatientId
      ? sql`and n.patient_id = ${effectivePatientId}`
      : sql``;

    const rows = await sql`
      select
        n.id as note_id,
        n.patient_id,
        p.name as patient_name,
        pr.name as author_name,
        n.content,
        n.created_at
      from public.patient_notes n
      join public.patients p on p.id = n.patient_id
      left join public.profiles pr on pr.user_id = n.author_id
      where n.organization_id = ${caller.organizationId}
        ${patientFilter}
      order by n.created_at desc
      limit ${limit}
    `;

    return {
      results: rows.map((r) => ({
        noteId: r.note_id as string,
        patientId: r.patient_id as string,
        patientName: r.patient_name as string,
        authorName: (r.author_name as string) ?? "Unknown",
        content: r.content as string,
        createdAt: r.created_at instanceof Date
          ? r.created_at.toISOString()
          : (r.created_at as string),
      })),
    };
  },
});
