import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { z } from "zod";
import { ollama, DEFAULT_MODEL } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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

  let activeConversationId: string | null = conversationId ?? null;

  if (user && !activeConversationId) {
    const firstText = chatMessages
      .find((m: { role: string }) => m.role === "user")
      ?.parts?.find((p: { type: string }) => p.type === "text")?.text;

    const [conv] = await db
      .insert(conversations)
      .values({ userId: user.id, title: firstText?.slice(0, 100) ?? null })
      .returning();
    activeConversationId = conv.id;
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
    system:
      "You are a helpful clinical assistant for Sunset, a hospice care platform. " +
      "Answer questions clearly and concisely. " +
      "You do not provide medical diagnoses or prescriptions. " +
      "You can send notifications to users when asked.",
    messages: await convertToModelMessages(chatMessages),
    tools: { sendNotification },
    stopWhen: stepCountIs(3),
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

  return result.toUIMessageStreamResponse({
    headers: activeConversationId
      ? { "X-Conversation-Id": activeConversationId }
      : undefined,
  });
}
