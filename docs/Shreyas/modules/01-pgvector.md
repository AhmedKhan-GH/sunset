# Module 1 — pgvector

**Date:** 2026-05-09
**Status:** ✅ Done & verified

**Migration:** `supabase/migrations/20260509120001_enable_pgvector.sql`
**Tests:** `tests/db/01_pgvector.test.sql` — 11 tests, all passing
**Commits:** `1c16454` (migration), `f1a42ca` (tests)

## What it does
Enables the `vector` extension (v0.8.0) so any table can declare a `vector(N)` column for embeddings.

## Why it's first
Every table that does RAG / semantic search needs this extension installed first. Tables with `vector(...)` columns will fail to create until pgvector is registered.

## What was verified
- Extension installed at v0.8.0
- `vector(768)` columns can be created and inserted into
- `vector_dims()` returns the correct dimension
- Wrong-dimension inserts are rejected
- Distance operators all work: cosine `<=>`, L2 `<->`, inner-product `<#>`
- Both `ivfflat` and `hnsw` index types build successfully
- ANN order-by-similarity returns expected rows

## How to re-run the test
```bash
psql "$DATABASE_URL" -f tests/db/01_pgvector.test.sql
```
