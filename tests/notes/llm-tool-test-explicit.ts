/**
 * Same as llm-tool-test.ts but with EXPLICIT tool-use instructions in
 * each prompt. Small models often need direct instructions like "call X"
 * to actually invoke a tool. This confirms the wiring works at all,
 * separate from the model's autonomous tool selection ability.
 */
import { generateText, stepCountIs } from "ai";
import { ollama } from "@/lib/ai/ollama";
import { addPatientNoteTool } from "@/lib/ai/tools/notes-tools";
import { searchNotesTool, recentNotesTool } from "@/lib/ai/tools/search-tools";
import {
  findPatientByNameTool,
  listMyPatientsTool,
} from "@/lib/ai/tools/roster-tools";

const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:1b";

const SCENARIOS = [
  {
    name: "explicit findPatientByName",
    prompt: 'Call the findPatientByName tool with name="Dorothy".',
    expected: "findPatientByName",
  },
  {
    name: "explicit listMyPatients",
    prompt: "Call the listMyPatients tool with no arguments.",
    expected: "listMyPatients",
  },
  {
    name: "explicit recentNotes",
    prompt: "Call the recentNotes tool with limit=5.",
    expected: "recentNotes",
  },
];

async function main() {
  console.log(`=== Explicit tool-call test (${MODEL}) ===\n`);
  let passed = 0;
  for (const s of SCENARIOS) {
    console.log(`[${s.name}]`);
    const t = Date.now();
    const result = await generateText({
      model: ollama(MODEL),
      system: "You are a tool-using agent. Always call the requested tool with the exact arguments asked.",
      prompt: s.prompt,
      tools: {
        findPatientByName: findPatientByNameTool,
        listMyPatients: listMyPatientsTool,
        searchNotes: searchNotesTool,
        recentNotes: recentNotesTool,
        addPatientNote: addPatientNoteTool,
      },
      stopWhen: stepCountIs(2),
    });
    const calls = (result.toolCalls ?? []).map((tc) => tc.toolName);
    const hit = calls.includes(s.expected);
    if (hit) passed++;
    console.log(`  ${hit ? "✓" : "·"} called: ${calls.join(", ") || "(none)"} | expected ${s.expected} | ${Date.now() - t}ms`);
  }
  console.log(`\n=== ${passed}/${SCENARIOS.length} explicit tool calls succeeded ===`);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
