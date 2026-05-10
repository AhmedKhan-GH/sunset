import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { conversations, messages, profiles, organizations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { addPatientNoteTool } from "@/lib/ai/tools/notes-tools";
import { searchNotesTool, recentNotesTool } from "@/lib/ai/tools/search-tools";
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

  // Load organization system prompt for the current user
  let orgSystemPrompt: string | null = null;
  if (user) {
    const [profile] = await db
      .select({ organizationId: profiles.organizationId })
      .from(profiles)
      .where(eq(profiles.userId, user.id));
    if (profile?.organizationId) {
      const [org] = await db
        .select({ systemPrompt: organizations.systemPrompt })
        .from(organizations)
        .where(eq(organizations.id, profile.organizationId));
      orgSystemPrompt = org?.systemPrompt ?? null;
    }
  }

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
      "TOOLS — every tool enforces role-based access via the user's session.",
      "If a tool returns { error: \"...\" }, relay the error briefly; do NOT retry.",
      "",
      "SEARCH:",
      "  searchNotes — semantic search over clinical notes. Pass patientId to scope to one patient,",
      "    or omit for org-wide results. Use since/until for time-bounded queries.",
      "  recentNotes — chronological feed of latest notes. Same scoping rules.",
      "  findPatientByName — resolve a patient name to their UUID before searching.",
      "",
      "NOTE-TAKING (practitioner/admin only):",
      "  After substantive discussions about a patient, OFFER to save key points as a clinical note.",
      "  Don't save without confirmation. When confirmed, call addPatientNote with a concise 1-3",
      "  sentence clinical summary. Notes are embedded for future semantic retrieval.",
      "",
      "ROSTER:",
      "  listMyPatients, getPatientDetails, listOrganizationPractitioners — lookup tools.",
      "",
      "SELF (patient/relative):",
      "  getMyOrganization, getMyCareTeam, getMyRecentNotes, getMyRelatives — self-service tools.",
      "  Patients and relatives cannot create notes but can search their own.",
      ...(orgSystemPrompt ? ["", "ORGANIZATION INSTRUCTIONS:", orgSystemPrompt] : []),
    ].join("\n"),
    messages: await convertToModelMessages(chatMessages),
    tools: {
      searchNotes: searchNotesTool,
      recentNotes: recentNotesTool,
      addPatientNote: addPatientNoteTool,
      listMyPatients: listMyPatientsTool,
      findPatientByName: findPatientByNameTool,
      getPatientDetails: getPatientDetailsTool,
      listOrganizationPractitioners: listOrganizationPractitionersTool,
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
