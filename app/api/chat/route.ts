import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { z } from "zod";
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

const sendNotification = tool({
  description: "Send a notification to a user with a title and message",
  inputSchema: z.object({
    title: z.string().describe("Short title for the notification"),
    message: z.string().describe("The notification body text"),
  }),
  execute: async (input: { title: string; message: string }) => {
    return { success: true, title: input.title, message: input.message, sentAt: new Date().toISOString() };
  },
});

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
      "You have access to tools that query the platform's database. The tools " +
      "automatically enforce role-based access control — they will return " +
      '{ "error": "..." } if the caller is not allowed to perform an action. ' +
      "When a tool returns an error, relay it briefly to the user instead of retrying.\n\n" +
      "Available tools fall into three groups:\n" +
      "1. Patient note tools (practitioners): searchPatientNotes (semantic search " +
      "over a single patient's notes), recentPatientNotes (latest N notes), " +
      "addPatientNote (write a new clinical note). For most patient questions, " +
      "first use findPatientByName to get the patient ID, then call the note tool.\n" +
      "2. Roster tools (practitioners and org admins): listMyPatients, " +
      "findPatientByName, getPatientDetails, listOrganizationPractitioners.\n" +
      "3. Self tools (patients and relatives): getMyOrganization, getMyCareTeam, " +
      "getMyRecentNotes, getMyRelatives.\n\n" +
      "When a practitioner asks about a patient, prefer to call a tool over " +
      "guessing. Cite specific note content when summarizing.",
    messages: await convertToModelMessages(chatMessages),
    tools: {
      sendNotification,
      searchPatientNotes: searchPatientNotesTool,
      recentPatientNotes: recentPatientNotesTool,
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
    stopWhen: stepCountIs(6),
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
