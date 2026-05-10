# Vercel AI SDK + Ollama: Local Inference with Tool Calling

## Overview

Use the Vercel AI SDK to run LLM inference locally via Ollama with full tool calling support. No API keys, no cloud dependencies, no patient data leaving your machine.

## Prerequisites

- Node.js 18+
- Docker installed and running
- A model that supports tool calling (see model table below)

## Ollama Setup (Docker — HIPAA-compliant isolation)

Run Ollama in a container with no external network access:

```bash
# Create an isolated Docker network (no internet access)
docker network create --internal ollama-net

# Run Ollama container on the isolated network
docker run -d \
  --name ollama \
  --network ollama-net \
  -p 127.0.0.1:11434:11434 \
  -v ollama-data:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama

# Pull a model (temporarily connect to bridge network for download)
docker network connect bridge ollama
docker exec ollama ollama pull gpt-oss:20b
docker network disconnect bridge ollama
```

After the model is pulled, the container only listens on `127.0.0.1:11434` with no outbound internet access. All inference data stays on the host machine.

### Verify isolation

```bash
# Should fail — no outbound access
docker exec ollama curl -s https://example.com
# Should succeed — inference works
curl http://127.0.0.1:11434/api/generate -d '{"model":"gpt-oss:20b","prompt":"hello","stream":false}'
```

### GPU support (optional)

```bash
# NVIDIA GPU passthrough
docker run -d \
  --name ollama \
  --gpus all \
  --network ollama-net \
  -p 127.0.0.1:11434:11434 \
  -v ollama-data:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama
```

## Installation

```bash
npm install ai @ai-sdk/openai @ai-sdk/react zod
```

> Ollama exposes an OpenAI-compatible API, so we use `@ai-sdk/openai` pointed at the local Ollama server.

## Configuration

### Create the Ollama Provider

```ts
// lib/ai/ollama.ts
import { createOpenAI } from "@ai-sdk/openai";

export const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama", // required by the SDK but unused by Ollama
});

export const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "gpt-oss:20b";
```

### Environment Variables

```env
# .env.local
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=gpt-oss:20b
```

## Tool Calling

### Defining Tools

```ts
// lib/ai/tools.ts
import { tool } from "ai";
import { z } from "zod";

export const patientLookup = tool({
  description: "Look up a patient by name or MRN",
  parameters: z.object({
    query: z.string().describe("Patient name or MRN"),
  }),
  execute: async ({ query }) => {
    // query your database here
    return { id: "pt_123", name: "Jane Doe", mrn: "MRN-0042" };
  },
});

export const getVitals = tool({
  description: "Get the latest vitals for a patient",
  parameters: z.object({
    patientId: z.string().describe("The patient's ID"),
  }),
  execute: async ({ patientId }) => {
    return {
      heartRate: 72,
      bloodPressure: "120/80",
      temperature: 98.6,
      recordedAt: new Date().toISOString(),
    };
  },
});
```

### Streaming Chat Route

```ts
// app/api/chat/route.ts
import { streamText } from "ai";
import { ollama, DEFAULT_MODEL } from "@/lib/ai/ollama";
import { patientLookup, getVitals } from "@/lib/ai/tools";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: ollama(DEFAULT_MODEL),
    system:
      "You are a helpful clinical assistant for Sunset, a hospice care platform. " +
      "Answer questions clearly and concisely. " +
      "You do not provide medical diagnoses or prescriptions.",
    messages,
    tools: { patientLookup, getVitals },
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
```

### Client-Side with `useChat`

```tsx
"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong>
          {m.parts
            .filter((p) => p.type === "text")
            .map((p, i) => (
              <span key={i}>{p.text}</span>
            ))}
          {m.parts
            .filter((p) => p.type === "tool-invocation")
            .map((p) => (
              <pre key={p.toolInvocationId}>
                {p.toolName}: {JSON.stringify(p.result, null, 2)}
              </pre>
            ))}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

## Multi-Step Tool Calling

Setting `maxSteps` allows the model to chain tool calls:

1. User: "What are Jane Doe's latest vitals?"
2. Model calls `patientLookup({ query: "Jane Doe" })` → `{ id: "pt_123" }`
3. Model calls `getVitals({ patientId: "pt_123" })` → vitals data
4. Model responds: "Jane Doe's heart rate is 72 bpm, BP 120/80..."

## Models with Tool Calling Support

| Model | Size | Tool Calling | Notes |
|---|---|---|---|
| `qwen2.5` | 0.5B–72B | Yes | Best balance of speed and capability |
| `llama3.1` | 8B–405B | Yes | Strong general purpose |
| `mistral` | 7B | Yes | Fast, good for simple tools |
| `command-r` | 35B | Yes | Good at multi-step reasoning |
| `llama3-groq-tool-use` | 8B–70B | Yes | Fine-tuned for tool use |

## HIPAA Compliance Notes

- Ollama runs in a Docker container on an isolated network with no outbound internet access
- All inference happens locally — no PHI leaves the host machine
- Model weights are stored in a Docker volume (`ollama-data`), not in the application directory
- The container binds to `127.0.0.1` only — not accessible from other machines on the network
- After pulling model weights, disconnect the bridge network to prevent any data egress
- Audit logging of prompts/responses should be implemented at the application layer
