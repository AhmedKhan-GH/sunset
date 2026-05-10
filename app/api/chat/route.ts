import { streamText } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ai/ollama";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: ollama(DEFAULT_MODEL),
    system:
      "You are a helpful clinical assistant for Sunset, a hospice care platform. " +
      "Answer questions clearly and concisely. " +
      "You do not provide medical diagnoses or prescriptions.",
    messages,
  });

  return result.toUIMessageStreamResponse();
}
