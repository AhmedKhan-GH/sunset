import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  searchPatientNotesTool,
  recentPatientNotesTool,
  addPatientNoteTool,
} from "@/lib/ai/tools/notes-tools";
import {
  searchOrgNotesTool,
  searchPatientNotesByDateTool,
  recentOrgActivityTool,
} from "@/lib/ai/tools/search-tools";
import {
  listMyPatientsTool,
  findPatientByNameTool,
  getPatientDetailsTool,
  listOrganizationPractitionersTool,
} from "@/lib/ai/tools/roster-tools";
import {
  getMyOrganizationTool,
  getMyCareTeamTool,
  getMyRecentNotesTool,
  getMyRelativesTool,
} from "@/lib/ai/tools/self-tools";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { messages: chatMessages, conversationId } = await req.json();

  const activeConversationId: string | null = conversationId ?? null;

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
      "You are a clinical assistant for Sunset, a hospice care platform.",
      "Answer clearly and concisely. You do not provide medical diagnoses or prescriptions.",
      "",
      "TOOLS — every tool enforces role-based access. If a tool returns { error: \"...\" },",
      "relay the error briefly; do NOT retry with the same arguments.",
      "",
      "When a practitioner asks about a specific patient:",
      "  1. If you don't know the patient_id, call findPatientByName first.",
      "  2. Use searchPatientNotes (semantic), recentPatientNotes (chronological), or",
      "     searchPatientNotesByDate (time-bounded) depending on the question shape.",
      "  3. Cite specific note content when summarizing — quote short snippets so the",
      "     practitioner can verify.",
      "",
      "When a practitioner asks something org-wide (\"which patients...\", \"what's new\"):",
      "  • searchOrgNotes for semantic queries across patients",
      "  • recentOrgActivity for a chronological feed",
      "",
      "NOTE-TAKING — this is core to your value. After substantive discussions about a",
      "patient, OFFER to save the key points as a clinical note. Don't save without the",
      "practitioner's confirmation. When confirmed, call addPatientNote with a concise",
      "1-3 sentence clinical summary that includes severity, timing, intervention, and",
      "response. The note gets embedded so future searches can retrieve it.",
      "",
      "Patient and relative roles can ask about themselves: getMyOrganization,",
      "getMyCareTeam, getMyRecentNotes, getMyRelatives. They cannot create notes.",
    ].join("\n"),
    messages: await convertToModelMessages(chatMessages),
    tools: {
      // notes (per-patient)
      searchPatientNotes: searchPatientNotesTool,
      recentPatientNotes: recentPatientNotesTool,
      addPatientNote: addPatientNoteTool,
      // search (org-wide + date-bounded)
      searchOrgNotes: searchOrgNotesTool,
      searchPatientNotesByDate: searchPatientNotesByDateTool,
      recentOrgActivity: recentOrgActivityTool,
      // roster (find patients + practitioners)
      listMyPatients: listMyPatientsTool,
      findPatientByName: findPatientByNameTool,
      getPatientDetails: getPatientDetailsTool,
      listOrganizationPractitioners: listOrganizationPractitionersTool,
      // self (patient/relative)
      getMyOrganization: getMyOrganizationTool,
      getMyCareTeam: getMyCareTeamTool,
      getMyRecentNotes: getMyRecentNotesTool,
      getMyRelatives: getMyRelativesTool,
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
