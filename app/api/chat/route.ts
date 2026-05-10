import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { z } from "zod";
import { ollama, DEFAULT_MODEL } from "@/lib/ai/ollama";

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
  const { messages } = await req.json();

  const result = streamText({
    model: ollama(DEFAULT_MODEL),
    system:
      "You are a helpful clinical assistant for Sunset, a hospice care platform. " +
      "Answer questions clearly and concisely. " +
      "You do not provide medical diagnoses or prescriptions. " +
      "You can send notifications to users when asked.",
    messages: await convertToModelMessages(messages),
    tools: { sendNotification },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
