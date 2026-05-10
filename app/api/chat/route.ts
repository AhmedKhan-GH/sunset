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
