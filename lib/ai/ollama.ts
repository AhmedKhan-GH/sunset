import { createOpenAI } from "@ai-sdk/openai";

export const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama",
});

export const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
