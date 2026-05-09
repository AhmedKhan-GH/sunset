# MCP + gpt-oss:20b Setup — Sunset

How we connect the LLM (`gpt-oss:20b` on Ollama) to our tools (Supabase queries) using **the official MCP integration** (`@modelcontextprotocol/sdk`).

---

## What runs where

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│ Remote machine                │         │ Local dev / Vercel           │
│ - Ollama @ :11434             │◀───────▶│ - Next.js app (the host)     │
│ - gpt-oss:20b loaded          │  HTTP   │ - MCP Inspector (debug only) │
│ - Sunset MCP server @ :3030   │         │                              │
└──────────────────────────────┘         └──────────────────────────────┘
```

| Tool | Purpose | When you use it |
|---|---|---|
| **Next.js + `@modelcontextprotocol/sdk`** | The actual app. Server-side host that connects gpt-oss:20b ↔ MCP server. | Always. This is what gets shipped. |
| **MCP Inspector** | Official debugging UI. Lists tools, calls them by hand, shows raw responses. No LLM. | When the MCP server is misbehaving and you need to isolate "is the server broken?" from "is the model confused?" |

---

## Prerequisites

Get these from whoever owns the remote machine:

```bash
OLLAMA_URL=https://ollama.<your-host>           # or http://<ip>:11434
MCP_SUPABASE_URL=https://mcp.<your-host>/mcp    # streamable HTTP endpoint
MCP_SUPABASE_TOKEN=<bearer-token>               # if the MCP server requires auth
```

Smoke-test before anything else:

```bash
curl -s "$OLLAMA_URL/api/tags" | jq '.models[].name'   # should list gpt-oss:20b
curl -s "$MCP_SUPABASE_URL"                            # MCP handshake or 401 if auth required
```

If either fails, fix the network before continuing.

---

## The integration (Next.js + official SDK)

### Install

```bash
npm i @modelcontextprotocol/sdk ollama
```

### Env vars (`.env.local`)

```
OLLAMA_URL=...
MCP_SUPABASE_URL=...
MCP_SUPABASE_TOKEN=...
```

### `lib/llm/mcp-host.ts`

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_URL! });

let client: Client | null = null;
let cachedTools: any[] = [];

async function getMcpClient() {
  if (client) return client;

  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.MCP_SUPABASE_URL!),
    {
      requestInit: {
        headers: { Authorization: `Bearer ${process.env.MCP_SUPABASE_TOKEN}` },
      },
    },
  );

  client = new Client({ name: "sunset-app", version: "0.1.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  cachedTools = tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.inputSchema,
    },
  }));

  return client;
}

export async function askLlm(systemPrompt: string, userMessage: string) {
  const mcp = await getMcpClient();
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < 6; i++) {
    const res = await ollama.chat({
      model: "gpt-oss:20b",
      messages,
      tools: cachedTools,
    });

    messages.push(res.message);
    const calls = res.message.tool_calls ?? [];
    if (calls.length === 0) return res.message.content;

    for (const call of calls) {
      const result = await mcp.callTool({
        name: call.function.name,
        arguments: call.function.arguments,
      });
      messages.push({
        role: "tool",
        content: JSON.stringify(result.content),
      });
    }
  }

  throw new Error("Tool loop exceeded max iterations");
}
```

### Use it from a Server Action

```ts
// app/dashboard/patients/[id]/actions.ts
"use server";
import { askLlm } from "@/lib/llm/mcp-host";

export async function summarizePatient(patientId: string, question: string) {
  return askLlm(
    "You are a clinical assistant for hospice nurses. Be concise and cite the source utterance IDs.",
    `Patient ID: ${patientId}\nQuestion: ${question}`,
  );
}
```

---

## Debugging with MCP Inspector

Use this when the model's answers seem wrong and you want to confirm the MCP server itself is returning correct data.

```bash
npx @modelcontextprotocol/inspector
```

Opens a browser UI. Configure the connection:

- **Transport:** `Streamable HTTP`
- **URL:** the value of `MCP_SUPABASE_URL`
- **Headers:** `Authorization: Bearer <MCP_SUPABASE_TOKEN>`

Then you can:

- Click **List Tools** → confirm every tool is registered with the schema you expect
- Click any tool → fill in arguments → **Call Tool** → see exactly what JSON the server returns
- Inspect resources, prompts, logs, and notifications the server sends

The Inspector talks to the MCP server only — it never calls the LLM. If a query returns garbage in Inspector, the bug is in the MCP server. If it returns clean data in Inspector but `askLlm` produces a bad answer, the bug is in your prompt or in how the model interprets results.

---

## Gotchas

- **Ollama runs single-request-per-model by default.** Set `OLLAMA_NUM_PARALLEL=2` on the server if multiple devs hit it at once.
- **First request loads the model into VRAM** (10-30 sec). Warm it before the demo.
- **`gpt-oss:20b` emits a hidden `thinking` channel.** Ignore unless debugging — never show it to clinicians.
- **MCP client is stateful.** Cache the client + tool list across requests (the example uses module-level `client`); reconnecting per request will tank performance.
- **Vercel can't reach `localhost`.** When deployed, `OLLAMA_URL` and `MCP_SUPABASE_URL` must be public-reachable.
- **CORS doesn't apply** — both calls happen server-side from Next.js, never browser → MCP/Ollama directly.
- **Auth tokens are server-only.** Never put `MCP_SUPABASE_TOKEN` in `NEXT_PUBLIC_*` vars.
- **Tool-loop runaway:** the 6-iteration cap above prevents the model from infinitely calling tools. Tune as needed.

---

## Verification checklist

- [ ] `curl $OLLAMA_URL/api/tags` lists `gpt-oss:20b`
- [ ] `curl $MCP_SUPABASE_URL` returns a valid response
- [ ] **Inspector** lists every expected tool with the right schema
- [ ] **Inspector** call to one tool returns the expected rows
- [ ] `askLlm()` from a Next.js Server Action returns a string
- [ ] Demo machine warmed (one dummy request fired) before the live demo

---

## When something breaks

| Symptom | Where to look |
|---|---|
| `connection refused` to Ollama | Remote box down, or `OLLAMA_HOST` not bound to `0.0.0.0:11434` |
| `401` from MCP | Missing/wrong `MCP_SUPABASE_TOKEN` |
| Inspector shows wrong/empty data | MCP server bug — fix there, not in the host |
| Inspector data is fine, model still answers wrong | Prompt or context issue, not MCP |
| Model returns text but never calls tools | Tools not passed to Ollama, or schema invalid (log `cachedTools`) |
| Model hallucinates a tool name | System prompt doesn't list available tools clearly enough |
| Long delays on first request | Cold model load — warm before demo |
| `gpt-oss:20b` not found | `ollama pull gpt-oss:20b` hasn't been run on the remote box |
