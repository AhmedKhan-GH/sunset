# Clinician-side semantic search

**Date:** 2026-05-09
**Status:** ✅ Done & verified
**Depends on:** Module 1 (pgvector), Module 3 (Auth)

> The practitioner-facing UI for retrieving patient symptom recordings by meaning, not keywords. This is the layer where the pgvector pipeline becomes a real product surface.

---

## 1. What this is

When a clinician opens `/clinician`, they get a search box. They type a description of what they're looking for ("patient hasn't been able to keep food down") and the page lists the most semantically similar entries from the corpus — in real time, with no exact-keyword match required.

Currently the corpus is `public.symptom_demo` (1001 synthetic hospice symptom recordings). When Chris's `utterances` table lands, the same UI will search real patient transcripts with one config change.

## 2. Files in this feature

| File | Role |
|---|---|
| `lib/llm/embed.ts` | Server-side singleton wrapper around `@xenova/transformers`. Loads `all-mpnet-base-v2` once per Node process; subsequent calls are ~10-20 ms. |
| `app/clinician/actions.ts` | `searchNotes()` Server Action. Embeds the query, runs cosine search via postgres-js, returns top 10. Role-gates to `clinician` profiles. |
| `app/clinician/search-notes.tsx` | Client Component with the input, example chips, and result list. Owns the 1-second debounced live-search behavior. |
| `app/clinician/page.tsx` | Server Component wrapper — auth check + role gate, renders `<SearchNotes />`. |
| `next.config.ts` | `serverExternalPackages: ["@xenova/transformers"]` so its ONNX/WASM artifacts are loaded at runtime instead of mangled by webpack. |
| `tests/db/pgvector_semantic_1000.ts` | Generates the 1001-row corpus the search runs against. |

## 3. Architecture

```
┌──────────────────────────────┐
│ Browser  (Client Component)  │
│ - input value (query)        │
│ - useEffect debounce 1000 ms │
│ - useTransition for loading  │
└───────────┬──────────────────┘
            │  Server Action call
            ▼
┌──────────────────────────────┐
│ Next.js Server Action        │
│ - role gate (require         │
│   profiles.role = clinician) │
│ - embedText(query)           │
│ - SQL via postgres-js        │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ all-mpnet-base-v2 (in-proc)  │    │ Postgres + pgvector          │
│ - 768-dim embedding          │    │ - HNSW index, cosine ops     │
│ - mean-pooled, L2-normalized │    │ - <=> for ANN search         │
└──────────────────────────────┘    └──────────────────────────────┘
```

Three things worth knowing about this shape:

1. **Single embedder per process.** `lib/llm/embed.ts` caches the pipeline in module scope, so the model loads once (~3-5 sec on first call) and is reused forever within that Node process. In dev that's the lifetime of `next dev`. On Vercel each lambda cold-start re-loads it — fine for low-volume internal use.
2. **Server Action, not Route Handler.** The clinician's "type and see results" pattern doesn't need streaming or external callers, so a Server Action is shorter and gives us cookie-based auth automatically.
3. **postgres-js direct, not Drizzle.** We need a `vector` literal cast (`'[v1,v2,...]'::vector`), and Drizzle's typed query builder doesn't model that cleanly. Direct SQL is simpler.

## 4. The live-search pattern (1-second debounce)

```ts
useEffect(() => {
  const trimmed = query.trim();
  if (!trimmed) return;
  if (trimmed === activeQuery) return;       // already searched for this
  const t = setTimeout(() => runSearch(trimmed), 1000);
  return () => clearTimeout(t);
}, [query]);
```

What this does:
- Every time the input changes, schedule a search 1 second later
- Every keystroke clears the prior timer (so we never run multiple searches for one phrase)
- Skip if the trimmed query matches what's already been searched (prevents whitespace-only re-runs)

The form's submit handler still works for users who want to search faster than 1 second. Example chips populate the input — debounce picks it up.

## 5. The corpus regeneration

`tests/db/pgvector_semantic_1000.ts` generates 1001 unique entries across 7 categories. The generators were rewritten to maximize *visible* and *structural* uniqueness:

- **15 templates per category** (was 5). Spans 5 "note styles":
  - Clinical shorthand: `Pt c/o severe sharp pain — chest. since this morning, worse with movement.`
  - SOAP-ish: `Pain assessment: chest, sharp, 7/10. Wincing every few minutes.`
  - Family quote: `"My chest hurts so badly" — patient. 9/10.`
  - Narrative observation: `Patient reports severe sharp pain in the chest, since this morning.`
  - Time-tagged: `Sudden onset severe pain in the chest. Mrs. Brown holding the area.`
- **Slot fillers expanded ~3x**: 12+ subjects (Mrs. Brown, Pt, Grandma, Mr. Patel…), 25+ body parts, 19 time-relative phrases, 10+ interventions per category.
- **Strict uniqueness assertion**: every text must appear exactly once across all categories. Throws on collision.

The 88% top-5 accuracy on this more diverse corpus (vs 93% on the simpler one) is the real number — semantic search holds up against significantly varied phrasing.

## 6. How to use it

```bash
# 1. Make sure the corpus exists
npx tsx --env-file=.env.local tests/db/pgvector_semantic_1000.ts

# 2. Start the dev server
npm run dev

# 3. Sign in as nurse@sunset.dev / nurse123
# 4. Land on /clinician
# 5. Type a query — results stream in 1 second after you stop typing
```

Things worth typing to feel out the system:

| Query | What it should find |
|---|---|
| `patient hasn't been able to keep food down` | nausea/vomiting recordings |
| `trouble breathing when lying flat` | shortness-of-breath recordings (the lying-flat orientation matters) |
| `won't stop pacing the room` | anxiety/agitation |
| `high temp with chills` | fever, including alternating-chills/sweats variants |
| `family said she's been clutching her chest` | will probably skew toward agitation wording — see §8 |

## 7. Known limitations

- **Cold-start latency.** First search after `next dev` starts takes ~3-5 sec while the model loads. After that, ~200-500 ms per search.
- **Vercel cold starts.** Each new lambda invocation re-loads the model. For production, consider a long-running worker or edge runtime that doesn't cold-start.
- **All embedding happens server-side.** No PHI ever goes to a third-party API — by design, for HIPAA. But also means you can't trivially scale by offloading to OpenAI's embedder.
- **Anyone with `clinician` role sees every row in `symptom_demo`.** This is correct for the demo (it's synthetic data, no patient ownership). Once we move to real data, the search action must filter by `patient_id` and respect RLS.
- **No hybrid search yet.** Pure semantic. See §8.

## 8. Failure modes (and what to do about them)

These are real cases from our benchmark that any clinician using this should know:

### 8.1 Action verbs override body parts
Query: "patient keeps grabbing at her chest" → the model interprets "keeps grabbing" as agitation behavior, finds anxiety entries instead of chest pain. Mitigation: hybrid keyword + semantic search.

### 8.2 Strong words anchor the wrong concept
Query: "everything she swallows comes back up" → "swallows / eating" overlaps stronger than "comes back up / vomiting". Mitigation: query expansion ("vomiting, regurgitation, throwing up, emesis").

### 8.3 Vague queries get vague answers
Query: "patient seems exhausted and unwell" → returns whatever category the embedding most associates with broad malaise (often anxiety in our corpus). Correct behavior, but worth presenting top categories rather than a flat list when ambiguous.

## 9. What's planned next

- **Negative / contrast search** — find the *least* similar items (lowest cosine similarity). Useful for "show me what's unusual for this patient" or for triangulating queries.
- **Hybrid keyword + semantic** — add `pg_trgm` or `tsvector` keyword matching, fuse with the cosine ranking. Catches the action-verb failure mode in §8.1.
- **Patient scoping** — once we have real `utterances` with `patient_id`, the search action must filter by patient and respect RLS. Right now it's an unscoped corpus.
- **Re-ranking** — use a small cross-encoder for the top 50 results to refine ordering. Slower but more accurate.
- **Result highlighting** — show *why* a result was returned (token-level relevance). Helps clinicians trust or distrust each hit.

## 10. Re-running the test

The corpus generator and the UI use the same model and pipeline, so you can sanity-check the end-to-end behavior matches the CLI:

```bash
# CLI benchmark (8 queries, prints per-query top-5 accuracy)
npx tsx --env-file=.env.local tests/db/pgvector_semantic_1000.ts

# Re-query with new queries (faster, doesn't re-embed)
npx tsx --env-file=.env.local tests/db/pgvector_semantic_requery.ts

# Side-by-side embedding model comparison
npx tsx --env-file=.env.local tests/db/pgvector_model_comparison.ts
```

The CLI numbers should match what you experience in the UI for any given query.
