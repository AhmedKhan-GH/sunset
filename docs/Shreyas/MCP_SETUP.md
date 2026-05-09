# MCP + gpt-oss:20b Setup — Sunset

How we connect the LLM (`gpt-oss:20b` on Ollama) to our tools (Supabase queries) via MCP.

---

## What runs where

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│ Remote machine                │         │ Local dev laptop / Vercel    │
│ - Ollama @ :11434             │◀───────▶│ - Next.js app (Option B)     │
│ - gpt-oss:20b loaded          │  HTTP   │ - mcphost CLI (Option A)     │
│ - Sunset MCP server @ :3030   │         │                              │
└──────────────────────────────┘         └──────────────────────────────┘
```

**Two ways to use this stack:**

| | Option A — `mcphost` CLI | Option B — Next.js embedded |
|---|---|---|
| Purpose | Iterate on prompts/tools, smoke-test the model | The actual web app users hit |
| Who runs it | Devs on their laptop | Server-side Next.js (Server Actions / Route Handlers) |
| When to use | Before/during building features | What gets shipped |

You need **both**. A is for development. B is for production.

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
curl -s "$MCP_SUPABASE_URL"                            # should return MCP handshake or 401 if auth required
```

If either fails, stop here and fix the network before continuing.

---

## Option A — `mcphost` CLI (dev workflow)

### Install

```bash
# Requires Go ≥ 1.22
go install github.com/mark3labs/mcphost@latest
# or grab a prebuilt release from the GitHub releases page
```

### Configure

Create `~/.config/mcphost/config.json` (or pass `--config <path>`):

```json
{
  "mcpServers": {
    "sunset-supabase": {
      "type": "streamable-http",
      "url": "https://mcp.your-host/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_SUPABASE_TOKEN}"
      }
    }
  }
}
```

### Run

```bash
export OLLAMA_HOST="$OLLAMA_URL"
export MCP_SUPABASE_TOKEN=...

mcphost --model ollama:gpt-oss:20b
```

You get a chat REPL. Type a question, the model uses the tools the MCP server exposes. Use this to:

- Verify tools are reachable
- Iterate on system prompts
- Sanity-check the model's tool choices before wiring into the app

---

## Option B — Embedded MCP client in Next.js

This is what the app actually uses.

### Install

```bash
npm i @modelcontextprotocol/sdk ollama
```

### Env vars

In `.env.local`:

```
OLLAMA_URL=...
MCP_SUPABASE_URL=...
MCP_SUPABASE_TOKEN=...
```

### Wire it up

`lib/llm/mcp-host.ts`:

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

## Gotchas (read before debugging)

- **Ollama runs single-request-per-model by default.** Set `OLLAMA_NUM_PARALLEL=2` on the server if multiple devs hit it at once.
- **First request loads the model into VRAM** (10-30 sec). Warm it before the demo by sending one dummy chat.
- **`gpt-oss:20b` emits a hidden `thinking` channel.** Ignore unless debugging — never show it to clinicians.
- **MCP client is stateful.** Cache the client + tool list across requests (don't reconnect every call). The example above does this with module-level `client`.
- **Vercel can't reach `localhost`.** When deployed, `OLLAMA_URL` and `MCP_SUPABASE_URL` must be public-reachable URLs (not LAN IPs).
- **CORS doesn't apply** — both calls happen server-side from Next.js, never browser → MCP/Ollama directly.
- **Auth tokens are server-only secrets.** Never put `MCP_SUPABASE_TOKEN` or service-role keys in `NEXT_PUBLIC_*` env vars.
- **Tool-loop runaway:** the 6-iteration cap above prevents the model from infinitely calling tools. Tune as needed.

---

## Verification checklist

- [ ] `curl $OLLAMA_URL/api/tags` lists `gpt-oss:20b`
- [ ] `curl $MCP_SUPABASE_URL` returns a valid response
- [ ] `mcphost --model ollama:gpt-oss:20b` opens a REPL and lists tools on `/tools`
- [ ] A test question in the REPL produces a tool call + final answer
- [ ] Calling `askLlm()` from a Next.js Server Action returns a string
- [ ] Demo machine has been warmed (one dummy request fired) before the live demo

---

## When something breaks

| Symptom | Likely cause |
|---|---|
| `connection refused` to Ollama | Remote box down, or `OLLAMA_HOST` not bound to `0.0.0.0:11434` |
| `401` from MCP | Missing/wrong `MCP_SUPABASE_TOKEN` |
| Model returns text but never calls tools | Tools not passed correctly, or schema invalid (check `cachedTools`) |
| Model hallucinates a tool name | Bad system prompt — explicitly list available tools in the prompt |
| Long delays on first request | Cold model load — warm before demo |
| `gpt-oss:20b` not found | `ollama pull gpt-oss:20b` hasn't been run on the remote box |
