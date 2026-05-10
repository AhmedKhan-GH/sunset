import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  conversations,
  messages,
  profiles,
  organizations,
  patients,
  practitioners,
  relatives,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { addPatientNoteTool } from "@/lib/ai/tools/notes-tools";
import { searchNotesTool, recentNotesTool } from "@/lib/ai/tools/search-tools";
import {
  findPatientByNameTool,
  getPatientDetailsTool,
} from "@/lib/ai/tools/roster-tools";

async function buildSessionContext(userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  if (!profile || !profile.organizationId) return null;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, profile.organizationId));

  const context: string[] = [
    `User: ${profile.name ?? "Unknown"} (${profile.role.replaceAll("_", " ")})`,
    `Organization: ${org?.name ?? "Unknown"}`,
  ];

  if (profile.role === "organization_admin" || profile.role === "practitioner") {
    const patientList = await db
      .select({ id: patients.id, name: patients.name })
      .from(patients)
      .where(eq(patients.organizationId, profile.organizationId));

    const practitionerList = await db
      .select({
        userId: practitioners.userId,
        specialty: practitioners.specialty,
      })
      .from(practitioners)
      .where(eq(practitioners.organizationId, profile.organizationId));

    const practitionerProfiles = await Promise.all(
      practitionerList.map(async (p) => {
        const [pr] = await db
          .select({ name: profiles.name })
          .from(profiles)
          .where(eq(profiles.userId, p.userId));
        return { name: pr?.name ?? "Unknown", specialty: p.specialty };
      }),
    );

    context.push(
      `Patients (${patientList.length}): ${patientList.map((p) => `${p.name} [${p.id}]`).join(", ")}`,
    );
    context.push(
      `Practitioners: ${practitionerProfiles.map((p) => `${p.name}${p.specialty ? ` (${p.specialty})` : ""}`).join(", ")}`,
    );
  }

  if (profile.role === "patient") {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId));
    if (patient) {
      context.push(`Your patient record: ${patient.name} [${patient.id}]`);
      const rels = await db
        .select({ name: relatives.name, relationship: relatives.relationship })
        .from(relatives)
        .where(eq(relatives.patientId, patient.id));
      if (rels.length > 0) {
        context.push(`Your relatives: ${rels.map((r) => `${r.name} (${r.relationship})`).join(", ")}`);
      }
    }
  }

  if (profile.role === "relative") {
    const [rel] = await db
      .select()
      .from(relatives)
      .where(eq(relatives.userId, userId));
    if (rel) {
      const [patient] = await db
        .select({ id: patients.id, name: patients.name })
        .from(patients)
        .where(eq(patients.id, rel.patientId));
      if (patient) {
        context.push(`You are ${rel.name} (${rel.relationship} of ${patient.name} [${patient.id}])`);
      }
    }
  }

  return {
    contextBlock: context.join("\n"),
    orgSystemPrompt: org?.systemPrompt ?? null,
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { messages: chatMessages, conversationId } = await req.json();

  const activeConversationId: string | null = conversationId ?? null;

  const session = user ? await buildSessionContext(user.id) : null;

  if (user && activeConversationId) {
    const lastUserMessage = chatMessages
      .filter((m: { role: string }) => m.role === "user")
      .pop();
    if (lastUserMessage) {
      const textPart = lastUserMessage.parts?.find(
        (p: { type: string }) => p.type === "text",
      );
      if (textPart) {
        await db.insert(messages).values({
          conversationId: activeConversationId,
          role: "user",
          content: textPart.text,
        });
      }
    }
  }

  const result = streamText({
    model: ollama(DEFAULT_MODEL),
    system: [
      "You are a clinical care assistant for Sunset, a hospice and palliative care platform.",
      "",
      "Your role is to faithfully answer questions using the patient records and clinical notes",
      "available to you. When asked about a patient, always search their notes before responding —",
      "do not guess or rely on prior conversation alone.",
      "",
      `CURRENT DATE/TIME: ${new Date().toISOString()}`,
      "Use this to interpret relative time references ('today', 'this week', 'yesterday')",
      "and to populate since/until filters in search tools accurately.",
      "",
      ...(session ? ["SESSION CONTEXT:", session.contextBlock, ""] : []),
      "Guidelines:",
      "- Answer directly and completely. If the information exists in the notes, provide it.",
      "- Quote or paraphrase specific notes when relevant so the user can verify your answer.",
      "- If you cannot find the answer in the records, say so clearly rather than speculating.",
      "- When multiple notes are relevant, synthesize them chronologically to give a complete picture.",
      "- Use plain, compassionate language appropriate for a care setting.",
      "- Never fabricate clinical details. Accuracy is more important than completeness.",
      "",
      "When a practitioner or admin discusses observations about a patient, offer to save a summary",
      "as a clinical note. Only save after explicit confirmation.",
      "",
      "You do not provide medical diagnoses, prescriptions, or treatment recommendations.",
      "You are an information retrieval and documentation tool, not a clinician.",
      "",
      "TOOLS — every tool enforces role-based access via the user's session.",
      "If a tool returns { error: \"...\" }, relay the error briefly; do NOT retry.",
      ...(session?.orgSystemPrompt ? ["", "ORGANIZATION INSTRUCTIONS:", session.orgSystemPrompt] : []),
    ].join("\n"),
    messages: await convertToModelMessages(chatMessages),
    tools: {
      searchNotes: searchNotesTool,
      recentNotes: recentNotesTool,
      addPatientNote: addPatientNoteTool,
      findPatientByName: findPatientByNameTool,
      getPatientDetails: getPatientDetailsTool,
    },
    stopWhen: stepCountIs(8),
    async onFinish({ text, toolCalls }) {
      if (!user || !activeConversationId) return;

      if (text) {
        await db.insert(messages).values({
          conversationId: activeConversationId,
          role: "assistant",
          content: text,
        });
      }

      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          await db.insert(messages).values({
            conversationId: activeConversationId,
            role: "tool",
            content: "",
            toolName: tc.toolName,
            toolInput: "args" in tc ? tc.args : null,
          });
        }
      }

      await db
        .update(conversations)
        .set({ updatedAt: sql`extract(epoch from now())::integer` })
        .where(eq(conversations.id, activeConversationId));
    },
  });

  return result.toUIMessageStreamResponse();
}
