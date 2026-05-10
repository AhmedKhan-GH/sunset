# Changes — `shreyas-dev`

Module-by-module log of Supabase capability work. One file per module from `SUPABASE_PLANNING.md` §3, in `docs/Shreyas/modules/`.

| # | Module | Status | Doc |
|---|---|---|---|
| 1 | pgvector | ✅ done | [`modules/01-pgvector.md`](modules/01-pgvector.md) |
| 2 | RLS | (skipped — owned by another teammate) | — |
| 3 | Auth | ✅ done | [`modules/03-auth.md`](modules/03-auth.md) |
| 4 | Realtime | ✅ done | [`modules/04-realtime.md`](modules/04-realtime.md) |
| 5 | pg_cron | ✅ done | [`modules/05-pg-cron.md`](modules/05-pg-cron.md) |
| 6–12 | Storage / Edge Functions / pg_net / Vault / Webhooks | (out of scope for this branch) | — |
| 13 | Logs / audit | ✅ done | [`modules/13-logs-audit.md`](modules/13-logs-audit.md) |
| — | Clinician-side search UI | ✅ done | [`modules/clinician-search.md`](modules/clinician-search.md) |
| — | Negative search (filter-out) | ✅ done | [`modules/negative-search.md`](modules/negative-search.md) |

## How to read these docs

Each module file follows the same shape:

- **What it does** — one-paragraph summary
- **Why we need it** / **Why this was needed** — context
- **Files added/changed** — exact paths
- **What was verified** — what the test asserts
- **How to re-run the test** — one-liner
- **Gotchas worth knowing** — what bit me, or will bite the next person

If you want to extend a module, find its file in `modules/` and append a new section. If you add a new module, drop a new `NN-name.md` file in there and add a row to the table above.
