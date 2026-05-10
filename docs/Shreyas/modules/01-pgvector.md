# Module 1 — pgvector + semantic search

**Date:** 2026-05-09
**Status:** ✅ Done & verified
**Owner of further changes:** anyone touching the embedding pipeline must re-run the 1000-row benchmark and update the numbers in §10 below.

> This is the core retrieval layer for medical RAG over hospice records. Every "show me what this patient said about pain" query goes through this pipeline. Read this before changing the embedding model, the vector dimension, the index type, or the distance operator — those decisions are coupled.

---

## 1. What this module gives the app

Two things, both required for RAG over patient records:

1. **A storage primitive** — `vector(N)` columns in Postgres, plus indexes that make nearest-neighbor queries fast.
2. **A working pipeline** — text → embedding → store, then query-text → embedding → search → top-K results.

The second part isn't built into pgvector — you bring your own embedding model. We picked one (§5) and validated it (§10).

## 2. Files in this module

| File | What it does |
|---|---|
| `supabase/migrations/20260509120001_enable_pgvector.sql` | Enables the `vector` Postgres extension |
| `tests/db/01_pgvector.test.sql` | 11 raw-SQL assertions (extension version, dim enforcement, distance operators, index types) — proves pgvector is correctly installed |
| `tests/db/pgvector_semantic_demo.ts` | 12-symptom hello-world demo |
| `tests/db/pgvector_semantic_1000.ts` | 1000-row corpus + 8-query benchmark |
| `tests/db/pgvector_semantic_requery.ts` | Re-queries an existing corpus without re-embedding (fast iteration) |
| `tests/db/pgvector_model_comparison.ts` | Head-to-head benchmark across embedding models |

Run any of them with `npx tsx --env-file=.env.local <path>`.

## 3. Why this matters for the product

Sunset's value is fast, accurate retrieval over a patient's history. Concrete examples:

- A nurse opens a patient and asks _"summarize this patient's pain over the last 24 hours."_ The system needs to retrieve every utterance about pain — even if the patient never said the word "pain" (said "it hurts", "burning", "pressure-like").
- A doctor reviews a new patient and asks _"has the family mentioned shortness of breath at night?"_ The system needs to surface utterances about breathing while horizontal, gasping, choking — across hundreds of recordings.
- The on-call clinician at 2 AM wants _"the most relevant 5 minutes of audio for what's happening right now."_ Retrieval must be sub-second over a year of recordings.

Keyword search can't do any of this reliably. Semantic search can — and pgvector is what makes it real.

## 4. The schema convention

All embeddable tables follow this pattern:

```sql
create table <table_name> (
  id          uuid primary key default gen_random_uuid(),
  ... domain columns ...
  embedding   vector(768),     -- nullable; backfilled by an async embed worker
  created_at  bigint not null default extract(epoch from now())::bigint
);

create index <table_name>_embedding_hnsw
  on <table_name> using hnsw (embedding vector_cosine_ops);
```

**Three choices baked in:**

- `vector(768)` — fixed dimension. Must match the embedding model's output. **Never mix dimensions** in one column.
- `hnsw` index — see §7.
- `vector_cosine_ops` — see §6.

When Chris's `clinical_impressions` and `utterances` tables land, they should follow this exact pattern.

## 5. Embedding model: `all-mpnet-base-v2`

**Choice:** [`Xenova/all-mpnet-base-v2`](https://huggingface.co/Xenova/all-mpnet-base-v2) running locally via `@xenova/transformers` (ONNX runtime in Node).

**Why this one:**

| Criterion | Value |
|---|---|
| Output dim | 768 (matches schema) |
| Runs without API keys | ✅ (local ONNX) |
| HIPAA-compatible | ✅ (no PHI leaves the perimeter) |
| Speed (M-series Mac) | ~12-16 ms per text, batchable to 32 |
| Top-5 accuracy on our 18-query benchmark | 82.4% |
| License | Apache 2.0 |

**Alternatives we considered and rejected:**

| Model | Why rejected |
|---|---|
| `bge-base-en-v1.5` (768 dim) | Newer general-purpose model, but on our benchmark scored **75.3% vs MPNet's 82.4%** — worse on this domain (see §10) |
| `bge-large-en-v1.5` (1024 dim) | Would require schema change to `vector(1024)`. Marginal gain, big cost. |
| `OpenAI text-embedding-3-small/large` | Strongest general-purpose models, but cloud-only — sends PHI to a third-party. Requires BAA. Rejected for HIPAA reasons. |
| `MedCPT` (NCBI, 768 dim) | Trained on PubMed click data — optimized for academic literature retrieval. Our corpus is conversational symptom transcripts, not clinical literature. **Domain mismatch.** Worth evaluating later if we add a clinical-literature surface (e.g., "look up evidence for this protocol"). |
| `NeuML/pubmedbert-base-embeddings` (768 dim) | Same domain mismatch. Also not available pre-converted to ONNX for transformers.js — would require offline conversion work. |

**Key insight on healthcare embedding models:** there's no single "industry standard." For **clinical literature retrieval** (PubMed-style searches), domain-tuned models like MedCPT win. For **conversational symptom monitoring** (our case — what families say, transcribed), strong general-purpose models like MPNet often outperform domain-specific ones because the text is everyday speech, not academic prose.

If we ever add a literature-search surface (e.g., "what does the evidence say about prescribing X for Y"), evaluate MedCPT side-by-side then. For symptom recordings, MPNet stays.

## 6. Distance operators — pick one, stick with it

pgvector exposes three operators for comparing two vectors. We use **cosine** everywhere.

| Operator | Meaning | When to use |
|---|---|---|
| `<=>` | **Cosine distance** = 1 − cos(θ). Lower = more similar. | ✅ Our default. Magnitude-invariant; matches how MPNet was trained. |
| `<->` | L2 (Euclidean) distance | Use only if your embeddings aren't normalized. MPNet outputs are unit-normalized, so cosine is preferred. |
| `<#>` | Negative inner product | Equivalent to cosine for normalized vectors, but sign-flipped (lower is better). Used by some libraries; we don't. |

**Rule:** `vector_cosine_ops` index + `<=>` operator. Don't mix.

## 7. Index types — HNSW

pgvector offers two ANN (approximate nearest neighbor) indexes:

| Index | Build speed | Query speed | Accuracy | Best for |
|---|---|---|---|---|
| **HNSW** ✅ | Slower build | Fast queries, no warmup | Very high recall | Default. Good at any size. |
| IVFFlat | Fast build | Faster on tiny tables, requires the table to have rows before training | Lower recall, depends on `lists` parameter | Avoid for production. |

**We use HNSW.** Reasons:

- IVFFlat needs to be trained on existing data — bad for tables that start empty (every new utterance/clinical_impression table)
- HNSW recall stays consistently high without manual tuning
- Build time is one-time; query time is what matters

For our 1001-row corpus, HNSW build took 0.3 seconds. At 100k rows expect a few seconds. Insert into HNSW-indexed tables stays fast (~ms per row).

## 8. The pipeline, end to end

```
[ patient records voice ]
   ↓ (Whisper STT, separate module)
[ utterance.transcript text ]
   ↓ (background worker — TODO module)
   call embedder(text) → 768-dim Float32Array
   ↓
   UPDATE utterances SET embedding = '[v1,v2,...]'::vector WHERE id=...
   ↓
[ row stored, indexed in HNSW ]

──────────── later, on a clinician query ────────────

[ clinician asks "show pain over last 24h" ]
   ↓
   call embedder(query) → 768-dim Float32Array
   ↓
   SELECT ... FROM utterances
     WHERE patient_id = ?
     ORDER BY embedding <=> '[query vector]'::vector
     LIMIT 10;
   ↓
[ top 10 most semantically similar utterances ]
   ↓
[ feed to LLM as RAG context (separate module) ]
```

Two important things on this diagram:

- **Embedding writes are async**, not synchronous with the user-facing INSERT. The `utterance.embedding` column is nullable; a worker fills it in. Otherwise the patient-facing recording flow blocks on a 15ms model call.
- **All retrieval queries should also filter by `patient_id`** before/with the ORDER BY, otherwise you risk leaking data across patients. Use this pattern:
  ```sql
  SELECT * FROM utterances
   WHERE patient_id = ?
   ORDER BY embedding <=> $1
   LIMIT 10;
  ```
  This works fine — Postgres applies WHERE, then sorts the filtered subset by similarity. With RLS, the WHERE is enforced automatically.

## 9. Embedding model usage in code

The model is loaded once per process. First load downloads ~110 MB into `~/.cache/huggingface`; subsequent loads are sub-second.

```ts
import { pipeline } from "@xenova/transformers";

const embedder = await pipeline(
  "feature-extraction",
  "Xenova/all-mpnet-base-v2",
);

async function embed(text: string): Promise<number[]> {
  const out = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

// Batched (much faster):
const texts = ["…", "…", "…"];
const out = await embedder(texts, { pooling: "mean", normalize: true });
const dim = (out.dims as number[])[1]; // 768
const flat = out.data as Float32Array;
const embeddings = texts.map((_, i) =>
  Array.from(flat.slice(i * dim, (i + 1) * dim)),
);
```

**Two arguments matter:**

- `pooling: "mean"` — mean-pool the token embeddings. Required for sentence-transformer models; produces one vector per input.
- `normalize: true` — L2-normalize the output. Required for cosine to behave correctly. Don't skip.

**To insert into Postgres:**

```ts
const literal = `[${vec.join(",")}]`;
await sql`insert into utterances (..., embedding) values (..., ${literal}::vector)`;
```

The `::vector` cast is required — postgres-js sends it as text, Postgres needs the cast.

## 10. Benchmark results (1001 rows, 18 queries)

Generated 1001 unique synthetic hospice symptom descriptions across 7 categories (143 each):

- pain · shortness_of_breath · nausea_vomiting · anxiety_agitation · constipation · congestion · fever

Ran 18 queries (8 direct phrasing + 10 colloquial/harder), measuring "top-5 accuracy" = fraction of top-5 hits in the expected category. One query intentionally ambiguous and excluded from scoring.

| Model | Top-5 accuracy | Avg query latency (incl. embedding) | Corpus embed time |
|---|---|---|---|
| **`all-mpnet-base-v2` (current)** | **70/85 (82.4%)** | 9 ms | 15.6 s |
| `bge-base-en-v1.5` | 64/85 (75.3%) | 14 ms | 11.9 s |

**Conclusion:** MPNet wins by 7 points on this domain. Stay with MPNet.

Per-category accuracy (MPNet, top-5):

| Category | Direct queries | Colloquial queries |
|---|---|---|
| pain | 3/5 | 0/5 _("keeps grabbing at chest" → anxiety)_ |
| shortness_of_breath | 5/5 | 5/5 |
| nausea_vomiting | 4/5 | 1/5 _("everything she swallows comes back up" → SOB)_ |
| anxiety_agitation | 5/5 | 2/5 _("rocking back and forth in bed" — partial)_ |
| constipation | 5/5 | 5/5 |
| congestion | 5/5 | 5/5 |
| fever | 5/5 + 5/5 | 5/5 + 5/5 |

## 11. Known failure modes (and what to do about them)

These are real cases from our benchmark where MPNet got it wrong:

### 11.1 Action verbs override body parts
**Query:** "patient keeps grabbing at her chest" → 0/5 in pain (all anxiety hits)

The model latched onto "keeps grabbing" as agitation behavior more than "chest" as body part. This will happen.

**Mitigations:**
- **Hybrid search**: combine BM25 keyword search with semantic. Keyword finds "chest"; semantic ranks within. Most production RAG systems do this.
- **Query expansion**: prompt the LLM to rewrite the query before embedding (`"chest pain, chest discomfort, clutching chest, pain in heart area"`)
- **Result re-ranking** with a cross-encoder for top-K (slower but more accurate)

### 11.2 Strong words anchor on the wrong concept
**Query:** "everything she swallows comes back up" → top hit was a SOB row about "gasping for air after eating"

"Swallows" + "eating" overlap stronger than "comes back up" + "vomiting" in the embedding space.

**Mitigation:** same as above — hybrid search would catch "swallow" / "comes back up" via keywords.

### 11.3 Vague queries get vague answers
**Query:** "patient seems exhausted and unwell" → all anxiety hits

This is correct behavior — the query is genuinely ambiguous. Don't try to "fix" this in retrieval. Either:
- Have the LLM ask a clarifying question
- Surface multiple categories and let the clinician steer

### 11.4 What to monitor in production
- **Recall@K on flagged-relevant queries** — track whether real retrievals hit clinician-judged relevant rows
- **Per-category accuracy drift** over time
- **Query latency p99** — should stay sub-50ms even at 100k+ rows

## 12. How to add embedding support to a new table

Five steps. Use this checklist when Chris adds `clinical_impressions` and `utterances`.

```sql
-- 1. Schema
alter table <new_table>
  add column embedding vector(768);

-- 2. HNSW index
create index <new_table>_embedding_hnsw
  on <new_table> using hnsw (embedding vector_cosine_ops);

-- 3. Optional: realtime publication so re-embedding events propagate
alter publication supabase_realtime add table public.<new_table>;
```

```ts
// 4. Background worker (TODO module): on insert, embed transcript/text and update embedding
async function fillMissingEmbeddings() {
  const rows = await sql`select id, transcript from utterances where embedding is null limit 50`;
  for (const r of rows) {
    const v = await embed(r.transcript);
    const lit = `[${v.join(",")}]`;
    await sql`update utterances set embedding = ${lit}::vector where id = ${r.id}`;
  }
}
```

```ts
// 5. Query helper for clinician retrieval
async function ragSearch(patientId: string, query: string, k = 10) {
  const v = await embed(query);
  const lit = `[${v.join(",")}]`;
  return sql`
    select id, transcript, (embedding <=> ${lit}::vector) as distance
      from utterances
     where patient_id = ${patientId}
       and embedding is not null
     order by embedding <=> ${lit}::vector
     limit ${k}
  `;
}
```

That's the entire surface area for adding semantic search to a new table.

## 13. Industry-standard recommendations summary

If someone reading this in 6 months wants to **upgrade** the embedding model:

1. **For staying open-source / local:** evaluate **`bge-large-en-v1.5`** (1024 dim) and **`mxbai-embed-large-v1`**. Both stronger than MPNet on MTEB. Note: schema change to `vector(1024)` required.
2. **For switching to cloud (with BAA):** **OpenAI `text-embedding-3-large`** is the most common production choice in healthcare AI. Set `dimensions: 768` to keep our schema; or change to 3072 for max quality.
3. **For clinical literature retrieval (separate use case):** **MedCPT** or **`NeuML/pubmedbert-base-embeddings`**. Not relevant for symptom recordings.
4. **Always re-run** `tests/db/pgvector_model_comparison.ts` and update §10 of this doc with new numbers before merging.

## 14. Re-running the tests

```bash
# Pgvector extension correctness (raw SQL)
psql "$DATABASE_URL" -f tests/db/01_pgvector.test.sql

# 12-symptom hello-world (regenerates and queries)
npx tsx --env-file=.env.local tests/db/pgvector_semantic_demo.ts

# 1000-symptom benchmark (regenerates and queries)
npx tsx --env-file=.env.local tests/db/pgvector_semantic_1000.ts

# Re-query the existing corpus with new queries (fast)
npx tsx --env-file=.env.local tests/db/pgvector_semantic_requery.ts

# Side-by-side model comparison
npx tsx --env-file=.env.local tests/db/pgvector_model_comparison.ts
```

The corpus persists in `public.symptom_demo` between runs. To inspect it:

```sql
-- count by category
select category, count(*) from public.symptom_demo group by category order by category;

-- sample
select category, symptom_text from public.symptom_demo order by random() limit 20;
```

## 15. Open items the next person owns

- **Background embed worker** — currently embeddings are inserted in test scripts; production needs a long-running worker that picks up rows with `embedding is null` and fills them. Whether that's a Supabase Edge Function on a webhook trigger, a Next.js Route Handler, or a separate process — TBD by Ahmed.
- **Hybrid search** — BM25 + semantic. Postgres can do this with `pg_trgm` or `tsvector` + a custom rerank step. Worth adding once we have real data.
- **Per-patient evaluation harness** — once we have real recordings, build a small set of "this query should retrieve these utterances" judgment pairs and track recall over time.
- **Re-embedding migration plan** — if we ever switch the embedding model, every existing row needs re-embedding. Plan: keep `embedding_model_version` column on every embeddable table, run a backfill job, swap atomically.
