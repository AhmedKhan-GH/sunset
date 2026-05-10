import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { getCallerContext } from "@/lib/ai/auth";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

const sql = postgres(process.env.DATABASE_URL!);

const NOTE_CREATION_ROLES = ["practitioner", "organization_admin"] as const;

export const addPatientNoteTool = tool({
  description: [
    "Save a clinical note to a patient's record. This is the primary way the assistant",
    "preserves conversation context — after a substantive chat about a patient, summarize",
    "the key points and call this tool to persist them.",
    "",
    "Use when:",
    "  - The user explicitly asks to record / save / log something",
    "  - The conversation has produced a clear assessment, observation, or plan worth keeping",
    "",
    "Don't use when:",
    "  - The conversation is only navigation / lookups",
    "  - The user hasn't confirmed they want a note saved (offer first, then call)",
    "",
    "Content style: concise clinical summary, 1-3 sentences. Include severity, timing,",
    "intervention, response. Written in natural clinical language for future semantic retrieval.",
  ].join("\n"),
  inputSchema: z.object({
    patientId: z
      .string()
      .uuid()
      .describe("The UUID of the patient the note should be attached to."),
    content: z
      .string()
      .min(1)
      .describe("The clinical note text — concise summary in clinical-observation style."),
  }),
  execute: async (input) => {
    const auth = await getCallerContext();
    if (!auth.ok) return { error: auth.error };

    const { caller } = auth;

    if (!NOTE_CREATION_ROLES.includes(caller.role as (typeof NOTE_CREATION_ROLES)[number])) {
      return { error: `Role '${caller.role}' is not permitted to create notes.` };
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, input.patientId));

    if (!patient) return { error: "Patient not found." };
    if (patient.organizationId !== caller.organizationId) {
      return { error: "Patient is not in your organization." };
    }

    const trimmed = input.content.trim();
    if (!trimmed) return { error: "Note content cannot be empty." };

    const embedding = await embedText(trimmed);
    const vec = vectorLiteral(embedding);

    const rows = await sql`
      insert into public.patient_notes
        (organization_id, patient_id, author_id, content, embedding)
      values
        (${caller.organizationId}, ${input.patientId}, ${caller.userId}, ${trimmed}, ${vec}::vector)
      returning id
    `;

    const inserted = rows[0];
    if (!inserted) return { error: "Failed to insert note." };

    return { id: inserted.id as string };
  },
});
