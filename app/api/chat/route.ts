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
import {
  searchOrgNotesTool,
  searchPatientNotesByDateTool,
  recentOrgActivityTool,
} from "@/lib/ai/tools/search-tools";
import {
  pingPractitionerTool,
  pingRelativesTool,
  pingCareTeamTool,
} from "@/lib/ai/tools/notification-tools";

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
    system:
      "You are a helpful clinical assistant for Sunset, a hospice care platform. " +
      "Answer questions clearly and concisely. " +
      "You do not provide medical diagnoses or prescriptions. " +
      "\n\n" +
      "You have access to tools that query the platform's database. Tools enforce " +
      "role-based access — they return { \"error\": \"...\" } when the caller is not " +
      "allowed. Relay tool errors briefly instead of retrying.\n\n" +
      "Tool groups:\n" +
      "  • Per-patient notes (practitioners): searchPatientNotes, recentPatientNotes, " +
      "addPatientNote, searchPatientNotesByDate. To answer patient-specific questions, " +
      "first call findPatientByName to resolve the patient ID, then a note tool.\n" +
      "  • Org-wide search (practitioners, org_admins): searchOrgNotes (semantic across " +
      "all patients), recentOrgActivity (chronological).\n" +
      "  • Roster (practitioners, org_admins): listMyPatients, findPatientByName, " +
      "getPatientDetails, listOrganizationPractitioners.\n" +
      "  • Self (patients, relatives): getMyOrganization, getMyCareTeam, " +
      "getMyRecentNotes, getMyRelatives.\n" +
      "  • Notifications: pingPractitioner (patient/relative→doctor), pingRelatives " +
      "(practitioner→family), pingCareTeam (anyone→doctor + family). Use pingCareTeam " +
      "for urgent/worsening situations or after a check-in flags concerns. Always " +
      "include a clear title and a body that states what happened and what to do.\n\n" +
      "When summarizing notes, cite specific content. When the user asks the system to " +
      "alert someone, prefer the most appropriate ping tool over guessing.",
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
      // roster
      listMyPatients: listMyPatientsTool,
      findPatientByName: findPatientByNameTool,
      getPatientDetails: getPatientDetailsTool,
      listOrganizationPractitioners: listOrganizationPractitionersTool,
      // self (patient/relative)
      getMyOrganization: getMyOrganizationTool,
      getMyCareTeam: getMyCareTeamTool,
      getMyRecentNotes: getMyRecentNotesTool,
      getMyRelatives: getMyRelativesTool,
      // notifications (AI ping tools)
      pingPractitioner: pingPractitionerTool,
      pingRelatives: pingRelativesTool,
      pingCareTeam: pingCareTeamTool,
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
