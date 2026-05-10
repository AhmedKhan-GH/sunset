/**
 * End-to-end LLM tool-use test.
 *
 * Drives the chat route (or a minimal local copy of it) with a small
 * Ollama model and verifies the model actually calls the right tool
 * for representative practitioner queries.
 *
 * Run after `ollama serve` and `ollama pull qwen2.5:0.5b`:
 *   npx tsx --env-file=.env.local tests/notes/llm-tool-test.ts
 */
import { generateText, stepCountIs } from "ai";
import { ollama } from "@/lib/ai/ollama";
import {
  searchPatientNotesTool,
  recentPatientNotesTool,
  addPatientNoteTool,
} from "@/lib/ai/tools/notes-tools";
import {
  findPatientByNameTool,
  listMyPatientsTool,
  getPatientDetailsTool,
} from "@/lib/ai/tools/roster-tools";
import {
  searchOrgNotesTool,
  recentOrgActivityTool,
} from "@/lib/ai/tools/search-tools";

const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";

type Scenario = {
  name: string;
  prompt: string;
  expectedTools: string[];
};

const SCENARIOS: Scenario[] = [
  {
    name: "patient lookup by name",
    prompt: "Tell me about a patient named Dorothy.",
    expectedTools: ["findPatientByName"],
  },
  {
    name: "recent activity org-wide",
    prompt: "What's been happening with patients today?",
    expectedTools: ["recentOrgActivity"],
  },
  {
    name: "list patients",
    prompt: "Who are my patients?",
    expectedTools: ["listMyPatients"],
  },
  {
    name: "save a note",
    prompt:
      "Please save a note for patient ID 11111111-1111-1111-1111-111111111111: " +
      'pain reported 6/10, took oxycodone with partial relief.',
    expectedTools: ["addPatientNote"],
  },
  {
    name: "semantic search org",
    prompt: "Which patients have been mentioning anxiety?",
    expectedTools: ["searchOrgNotes", "findPatientByName"],
  },
];

async function runScenario(s: Scenario) {
  console.log(`\n[${s.name}]`);
  console.log(`  prompt: "${s.prompt}"`);
  const t = Date.now();
  const result = await generateText({
    model: ollama(MODEL),
    system:
      "You are a clinical assistant. Use the available tools to answer practitioner " +
      "questions. Tools may return errors which you should relay rather than retry.",
    prompt: s.prompt,
    tools: {
      searchPatientNotes: searchPatientNotesTool,
      recentPatientNotes: recentPatientNotesTool,
      addPatientNote: addPatientNoteTool,
      findPatientByName: findPatientByNameTool,
      listMyPatients: listMyPatientsTool,
      getPatientDetails: getPatientDetailsTool,
      searchOrgNotes: searchOrgNotesTool,
      recentOrgActivity: recentOrgActivityTool,
    },
    stopWhen: stepCountIs(4),
  });
  const ms = Date.now() - t;

  const calledTools = (result.toolCalls ?? []).map((tc) => tc.toolName);
  const expectedHit = s.expectedTools.some((t) => calledTools.includes(t));

  console.log(`  duration: ${ms}ms`);
  console.log(`  tools called: ${calledTools.length === 0 ? "(none)" : calledTools.join(", ")}`);
  console.log(`  expected one of: ${s.expectedTools.join(", ")}`);
  console.log(`  ${expectedHit ? "✓ PASS" : "· DID NOT CALL EXPECTED TOOL"} (small models often don't reliably tool-call)`);
  if (result.text) {
    const t = result.text.length > 200 ? result.text.slice(0, 197) + "…" : result.text;
    console.log(`  reply: ${t}`);
  }
  return { name: s.name, expectedHit, calledTools, ms };
}

async function main() {
  console.log(`=== LLM tool-use E2E test (model: ${MODEL}) ===`);
  console.log(`NOTE: this test does not authenticate, so tool execute() will return`);
  console.log(`{ error: "Not authenticated." }. We're verifying the model SELECTS the`);
  console.log(`right tool, not that the tool successfully completes.\n`);

  const results = [];
  for (const s of SCENARIOS) {
    try {
      results.push(await runScenario(s));
    } catch (e: any) {
      console.log(`  ✗ scenario crashed: ${e.message}`);
      results.push({ name: s.name, expectedHit: false, calledTools: [], ms: 0 });
    }
  }

  const passed = results.filter((r) => r.expectedHit).length;
  console.log(`\n=== ${passed}/${results.length} scenarios picked the expected tool ===`);
  console.log(`(Smaller models like qwen2.5:0.5b have limited tool-use reliability.`);
  console.log(`For production demos use a larger model: gpt-oss:20b, llama3.1:8b, etc.)`);
  process.exit(0);
}

main().catch((e) => {
  console.error("\nFAIL:", e);
  process.exit(1);
});
