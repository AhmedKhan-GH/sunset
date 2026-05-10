# Negative search (filter-out)

**Date:** 2026-05-09
**Status:** ✅ Done & verified
**Lives inside:** Module 1 (pgvector) + Clinician search UI

> A second optional search field that **demotes** results similar to its content. The user keeps typing what they want to find in the main field, and uses this one to push aside concepts they don't want mixed in.

---

## 1. What it is

Two fields on `/clinician`:

| Field | Required? | What it does |
|---|---|---|
| **Search** | ✅ | "Find recordings about this." |
| **Filter out** | optional | "Demote recordings about this." |

When the filter is empty, the page behaves like a normal most-similar search.

When the filter is set, every candidate row gets a combined score:

```
score = similarity(row, search) − similarity(row, filter)
```

Rows that match the search but are **unlike** the filter rise to the top. Rows similar to **both** get pushed down. Rows similar only to the filter never make it to the top 10 — their scores go negative.

## 2. Why subtraction (and not "filter where similarity < threshold")

Three options were on the table; we picked subtraction.

| Approach | What it does | Why we didn't pick it |
|---|---|---|
| **Hard filter** — `WHERE filter_sim < 0.4` | Drop any row above a similarity threshold to the filter | Threshold is a magic number that varies per query; brittle |
| **Multiply** — `score = pos_sim × (1 − neg_sim)` | Penalize multiplicatively | Sensitive to scale; doesn't degrade gracefully |
| **Subtract** ✅ | `score = pos_sim − neg_sim` | Smooth, no threshold to tune, works in pure SQL with no temp tables |

Subtraction also has a clean interpretation: the score is "how much closer is this row to the search than to the filter."

## 3. The SQL

When the filter is empty:

```sql
SELECT ...,
       (1 - (embedding <=> $search))::float AS similarity
  FROM symptom_demo
 ORDER BY embedding <=> $search ASC
 LIMIT 10;
```

When the filter is set:

```sql
SELECT ...,
       (1 - (embedding <=> $search))::float    AS similarity,
       (1 - (embedding <=> $filter))::float    AS filtered_similarity
  FROM symptom_demo
 ORDER BY (embedding <=> $filter) - (embedding <=> $search) DESC
 LIMIT 10;
```

Both vectors are L2-normalized, so cosine distance ranges 0–2 and the subtraction is well-behaved.

## 4. Use cases that actually matter for hospice

| Search | Filter out | Why |
|---|---|---|
| `pain` | `morning routine` | Find pain reports that aren't routine morning observations |
| `breathing trouble` | `lying down` | Breathing issues unrelated to position |
| `anxious` | `family visit` | Agitation not triggered by visitors |
| `nausea` | `medication time` | Nausea outside of dose-timing context |
| `restless` | `sundowning` | Restlessness that isn't the typical late-day pattern |

The pattern: when a clinician is looking for a *specific* clinical concern but knows there's a recurring noise concept that keeps polluting the results, the filter pushes the noise aside.

## 5. Trade-offs

### 5.1 Loss of HNSW acceleration when filter is set

The combined query sorts by a per-row computation involving **both** embeddings. HNSW only accelerates "nearest to one vector" queries, not "rank by f(distance to A, distance to B)". So when the filter is set, we sequential-scan the table.

At 1001 rows → ~5 ms. Negligible.
At 100k rows → ~100-500 ms. Acceptable for an interactive search.
At 10M rows → would matter. Switch to two-stage retrieval (see §6).

When the filter is empty, HNSW kicks back in — single-digit ms regardless of corpus size.

### 5.2 Score interpretation depends on filter strength

A row with `sim=0.7, filter-sim=0.6` has score 0.1.
A row with `sim=0.3, filter-sim=0.0` has score 0.3 — and ranks higher.

This is correct behavior (the second row is more "uniquely about the search"), but it can surprise users who expect "high similarity to search wins." The UI shows both numbers so the user can see what's happening.

### 5.3 The filter can over-remove

If you filter "morning" and the corpus has a lot of clinical notes that include `this morning` as a time tag, you'll demote *most* of the corpus — even pain entries you wanted. Recommendation: keep filter queries narrow to the concept you actually want gone, not to common stop-phrasing.

## 6. When to switch to two-stage retrieval

Once the corpus is large enough that the sequential scan hurts, do this instead:

1. **Stage 1**: HNSW lookup of top-N (e.g. N=200) by similarity to the search vector
2. **Stage 2**: in app code, embed the filter, compute the combined score for those 200 rows, return top 10

This keeps the HNSW path active and only does the expensive computation on a small candidate set. Threshold for switching: probably around 50k+ rows.

For now (1001 rows), the simple SQL is fine.

## 7. Files

| File | Role |
|---|---|
| `app/clinician/actions.ts` | `searchNotes(query, filterOut?)` Server Action — embeds both queries, runs the combined SQL when filter is set |
| `app/clinician/search-notes.tsx` | UI — two fields, both 1-second-debounced, single results list with `sim` + `filter-sim` per row |
| `app/clinician/page.tsx` | Wrapper — auth + role gate |
| `lib/llm/embed.ts` | Shared embedder, used for both queries |

## 8. Failure modes

The same failure modes from the main semantic search (see [`clinician-search.md`](clinician-search.md) §8) apply on the search side. The filter side adds a few:

- **Filter on a synonym, not the concept.** Filtering "morning" won't push aside "AM rounds" because they don't share enough surface form. Filter has to capture the concept semantically.
- **Filter too vague** ("issues") effectively cancels half the corpus and the result list collapses to nothing useful. Be specific.
- **Filter too narrow** (a single rare phrase) has almost no effect. Most rows have negligible similarity to it; the ranking barely shifts.

The sweet spot is filtering *concepts at roughly the same abstraction level* as the search query.

## 9. Future work

- **Per-row "why this was kept" indicator.** Currently we show two numbers; a small chart or color bar would communicate it faster.
- **Multiple filters.** Could support `score = sim − Σ(filter_sims) / N`. Diminishing returns past 1-2 filters.
- **Save filters per user.** A clinician working a complex patient might want to persist "always exclude routine morning observations" so they don't retype it.
