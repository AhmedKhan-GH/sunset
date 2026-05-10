import { createOpenAI } from "@ai-sdk/openai";

const provider = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama",
});

export const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "gpt-oss:20b";

export const ollama = (model: string) => provider.chat(model);
