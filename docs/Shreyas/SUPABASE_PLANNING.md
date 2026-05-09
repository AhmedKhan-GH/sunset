# Sunset — Supabase Planning

> Living document. Edit freely. Open decisions are tagged **`DECIDE:`**, assumptions are tagged **`ASSUMES:`**, and HIPAA-critical items are tagged **`HIPAA`**.

---

## 1. Product context (so this doc stays grounded)

**Sunset** is an iPad app that hospice provides to a patient's home for the duration of hospice care. It does two things:

1. **Symptom capture (patient/family-facing):** Patient or caregiver taps a symptom (pain, shortness of breath, nausea/vomiting, anxiety/agitation, constipation, congestion, fever). The app speaks scripted follow-up questions ("How much is your pain? Where? What kind?"), records voice answers, and schedules timed follow-ups ("It's 8pm — how's your pain now?"). Multiple caregivers may rotate through the same iPad in 24 hours.
2. **Clinical review (nurse/doctor-facing):** Nurses and doctors review the same patient's recordings + transcripts virtually or in-person, with proactive scheduled checks, reactive checks on patient complaint, and doctor-initiated checks.

**Why this matters for the data layer:**

- Voice recordings + transcripts are PHI. Everything PHI-bearing is HIPAA-regulated.
- The iPad is **shared across the patient and rotating caregivers** — auth model can't assume "one human = one account on the device."
- The clinical side is multi-tenant by hospice org and by care team — RLS has to enforce both patient-level and org-level isolation.
- Scheduled follow-ups ("ask in 1 hour") imply server-side cron, not just client timers (the iPad may be locked or off-network).

---

## 2. The big HIPAA picture on Supabase  `HIPAA`

Before any module choices, the platform-level requirements:

### 2.1 You must be on a HIPAA-eligible plan
- **Supabase HIPAA compliance requires the Team plan + the HIPAA add-on** (paid). Free and Pro tiers are *not* HIPAA-eligible — do not put PHI on them, even in dev.
- Sign a **BAA (Business Associate Agreement) with Supabase** before any real PHI touches the system. Until the BAA is signed, use synthetic data only.
- Every Supabase project that touches PHI must be flagged HIPAA in the dashboard. Mixed-use projects are not allowed — separate projects for PHI vs non-PHI.

### 2.2 Things you must also have BAAs for
- **Vercel** (if hosting Next.js there) → Vercel Enterprise + BAA, or move hosting.
- **Hostinger** (whiteboard mentions for domain) → domain registration is fine, but if any compute/email runs there, BAA needed.
- **OpenAI / Anthropic / any cloud LLM** → BAA required if PHI is sent. *This is your main argument for the local Ollama / GPT-OSS 20B plan — no third-party LLM means no third-party BAA, and PHI never leaves your perimeter.* `HIPAA`
- **Email/SMS providers** for OTP, password reset, appointment reminders → must be BAA-covered (e.g., Twilio, SendGrid with HIPAA add-on).
- **Any voice STT service** (Whisper API, Deepgram, etc.) → BAA required, *or* run STT locally next to the LLM.

### 2.3 Required HIPAA controls Supabase gives you (and what you still owe)
| Control | Supabase provides | You configure |
|---|---|---|
| Encryption at rest | ✅ AES-256 on managed Postgres + Storage | Nothing |
| Encryption in transit | ✅ TLS 1.2+ everywhere | Pin your client to TLS 1.2+, reject HTTP |
| Audit logs (project) | ✅ Dashboard + log drains | You must **also** keep app-level audit log in Postgres |
| Backups | ✅ PITR on Team | Set retention ≥ 7 days; test restores |
| MFA on dashboard | ✅ enforce in org | Make it mandatory for all team members |
| Network restrictions | ✅ allowlist | Restrict DB access to Supavisor / your app egress IPs |
| Row-level isolation | ✅ Postgres RLS | **You write every policy** — default-deny |
| Field-level encryption for high-sensitivity columns | ❌ not built in | Use `pgsodium` or app-level encryption |

### 2.4 The "keep PHI logged" trap
- **Do not log PHI.** Postgres `log_statement` is off by default — keep it that way.
- Edge Function `console.log` calls go to Supabase's log infra; **never** log voice transcripts, symptoms, or patient names.
- Realtime broadcasts are persisted in logs — same rule.
- Sentry / observability tooling needs scrubbing config + BAA before catching errors that may include PHI.

---

## 3. Supabase modules — relevance and how each fits

### 3.1 Postgres (the database itself) — **core**
The whole system lives here. Notes:
- Use a single project with multiple schemas: `app` (business data), `audit` (immutable audit log), `vector` (embeddings), `private` (server-only tables not exposed via PostgREST).
- Mark schemas you don't want PostgREST to expose: only `app` should be in the API exposed schemas list.
- **Drizzle ORM** is fine on top of this; it talks to Postgres directly. RLS still applies as long as Drizzle connects with a user-scoped JWT (via PostgREST/Supavisor pooler), not the service role.
- **DECIDE:** Drizzle for migrations, or Supabase CLI migrations (`supabase migration new`)? Mixing them gets messy. Recommend: Supabase CLI for schema/RLS, Drizzle only for typed queries — don't let Drizzle generate migrations that bypass the RLS-aware workflow.

### 3.2 Row-Level Security (RLS) — **non-negotiable**  `HIPAA`
This is your HIPAA enforcement layer. Rules of engagement:
- **Default deny on every table holding PHI.** `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` then explicit policies.
- Patients only see their own records. Caregivers see records of patients they're authorized for. Clinicians see records of patients on their team within their hospice org.
- Use a `current_user_role()` SQL function that reads JWT claims (`auth.jwt() ->> 'role'`, custom claims).
- **Avoid `auth.uid()` recursion in policies** — wrap helper functions in `SECURITY DEFINER` and `SET search_path = ''` to prevent infinite RLS lookups and search-path attacks.
- Policies should be written per-action (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) — `FOR ALL` hides bugs.
- Test policies with `pgTAP` or RLS-specific test suites; broken RLS = HIPAA breach.

### 3.3 Auth — **most fragile area, see §5**
Used for:
- Clinician login (nurses, doctors, hospice admins).
- Caregiver login (family members).
- Patient device "login" — see §5.4 for the iPad-shared-device problem.

### 3.4 Storage — **for voice recordings**  `HIPAA`
Each symptom answer is a recorded audio blob.
- One bucket per environment, **private** (no public access), with RLS-equivalent **storage policies** matching the DB policies.
- Path convention: `recordings/{org_id}/{patient_id}/{symptom_event_id}/{utterance_id}.webm` — makes RLS predicates easy.
- **All access via signed URLs only**, short TTL (60–300 sec). No long-lived URLs in any table.
- **DECIDE:** keep raw audio in Storage forever, or transcribe-then-discard-after-N-days? HIPAA retention is typically 6 years for the *record*, but not necessarily the raw audio if the transcript is in the legal record.
- **DECIDE:** client-side encrypt before upload? Adds key management pain but means even Supabase can't read audio. Probably overkill given BAA is in place.

### 3.5 Realtime — **for clinician dashboards**
Whiteboard says: *"Supabase realtime, run server action in back, push to clients immediately."*
- Use Postgres Changes (CDC over `app.symptom_events` etc.) so the nurse dashboard updates the moment a patient finishes a recording.
- **Realtime respects RLS only on the Postgres Changes channel**, and only when the JWT is attached to the realtime connection. Test this — it's the #1 footgun.
- Don't use Broadcast/Presence for PHI payloads — those are not RLS-checked. If you need broadcast, send only an opaque ID and have the client refetch via PostgREST (which *is* RLS-checked).

### 3.6 Edge Functions — **Deno serverless**
Use cases:
- Outbound calls to local Ollama/MCP server (proxy + auth).
- Webhook receivers.
- Server-side tasks that need the service role but shouldn't live in Next.js (e.g., signing a Storage URL with a 60s TTL after RLS check).
- **DECIDE:** Edge Functions vs Next.js Server Actions vs `pg_cron` + Postgres functions? See §4.
- **HIPAA:** confirm that Edge Functions runtime is in scope of the Supabase BAA — last I checked, yes on the HIPAA add-on, but verify in the current docs before shipping.

### 3.7 pgvector — **RAG over patient records**
Whiteboard: *"insert-time embed, semantic search on records."*
- Install `vector` extension (one click in Supabase).
- Embedding generated **by the local LLM stack** (not by an external embedding API — that would send PHI off-prem). Sentence-Transformers / `all-MiniLM` or `bge-m3` running next to Ollama is fine.
- Schema: `vector.symptom_event_embeddings(event_id uuid pk, embedding vector(768), tokens_used int, model text, created_at timestamptz)`.
- Index: HNSW with `vector_cosine_ops`.
- RLS still applies on the `symptom_events` table; semantic search joins through it so unauthorized rows never come back.

### 3.8 pg_cron — **scheduled symptom check-ins**
Critical: the "it's 8pm, how's your pain now?" follow-up cannot rely on a client-side timer (iPad may be off, locked, swapped between caregivers).
- `pg_cron` lives inside Postgres; schedules run even if no client is connected.
- Schedule: row in `app.scheduled_followups(patient_id, due_at, prompt_id, status)`. A `pg_cron` job every minute scans for `due_at <= now() AND status='pending'`, marks them firing, and either:
  - **(a)** Sends a Realtime broadcast to the iPad which plays the prompt, OR
  - **(b)** Sends an APNs push (via Edge Function → APNs) so the iPad wakes up.
- **DECIDE (a) vs (b):** broadcast is simpler but only works if the iPad app is foregrounded; APNs is the production-grade answer.

### 3.9 pg_net — **HTTP from inside Postgres**
Useful for letting `pg_cron` jobs hit your Edge Function or your local MCP server. Keep tokens in Vault, not inline.

### 3.10 Vault — **secrets at rest in Postgres**
Stores the keys you'll need for: APNs, local LLM auth, Twilio, etc. Encrypted with `pgsodium`. Read only via `SECURITY DEFINER` functions, never exposed to the API.

### 3.11 Database Webhooks — **outbound triggers**
Trigger an Edge Function on insert into `symptom_events` to:
1. Drop the audio file into the STT queue.
2. Generate embedding via local model.
3. Notify on-call nurse if the symptom severity crosses a threshold.

Webhooks are async and at-least-once — make handlers idempotent.

### 3.12 Foreign Data Wrappers (FDW) — **probably skip for now**
Useful if you ever need to read from an EHR's Postgres or an external warehouse. Out of scope for v1.

### 3.13 Logs / Log drains — **HIPAA audit trail**  `HIPAA`
- Enable log drains to a HIPAA-eligible SIEM / S3 with object-lock, *or* keep logs only in Supabase (with documented retention).
- HIPAA requires **6 years** of audit log retention for access to PHI. Supabase's default log retention is much shorter — you must drain and archive.
- Application audit log is separate from infra log: see §4.

---

## 4. Reference architecture

```
   iPad (patient/family)                        Web (nurses/doctors)
        │                                                │
        │  Supabase JS client                            │  Next.js (Vercel)
        │  - auth (PKCE flow)                            │  - @supabase/ssr
        │  - storage signed URL upload                   │  - Server Actions
        │  - realtime subscribe (patient channel)        │  - Realtime subscribe
        │                                                │
        ▼                                                ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                      Supabase project                        │
  │                                                              │
  │  Auth   PostgREST   Realtime   Storage   Edge Fns   pg_cron  │
  │     \\______________________ Postgres ______________________/  │
  │      schemas: app | audit | vector | private                 │
  │      extensions: pgvector | pg_cron | pg_net | pgsodium      │
  └──────────────────────────────────────────────────────────────┘
                              │
                  Edge Function / pg_net
                              ▼
                   ┌────────────────────────┐
                   │  Local LLM perimeter   │   ← on-prem, no PHI egress
                   │  - Ollama (GPT-OSS 20B)│
                   │  - MCP server (tools)  │
                   │  - Whisper / STT       │
                   │  - Embedding model     │
                   └────────────────────────┘
```

---

## 5. Supabase Auth — known issues and how to handle them

This is the section you specifically asked about. Auth is the area that bites people. Below is every Supabase auth gotcha I'd watch for on this project.

### 5.1 Roles in your system
You have at least four:
- **Patient** — passive, identified by device, may not interact directly.
- **Caregiver / family** — multiple per patient, rotates on the iPad.
- **Clinician** — nurse, doctor; reviewer side; multi-patient access scoped by team.
- **Org admin** — hospice IT/admin; user management within the hospice.

These should be expressed as a `app.user_role` enum stored in `app.profiles`, **not** in `auth.users` directly. Profile rows are linked 1:1 with `auth.users.id`. Keep `auth.users` lean.

### 5.2 The shared-iPad problem  ← biggest design decision
Multiple caregivers using the same iPad over 24 hours, plus the patient. You cannot make each caregiver log in/out — that's the same UX problem you have with paper notes today. Three viable patterns:

**Option A — Device account, soft caregiver attribution**
- The iPad is logged in as a *device account* (anonymous Supabase user, or a service account scoped to one patient).
- Before each recording, a 1-tap "Who's recording? [Patient] [Daughter Mary] [Son Tom] [Other]" overlay tags the recording's `recorded_by` field.
- **Pros:** zero friction; patient never has to authenticate.
- **Cons:** weaker attribution; "Other" is meaningless for legal record.

**Option B — Per-caregiver short PIN**
- Each enrolled caregiver gets a 4–6 digit PIN tied to their profile.
- iPad asks for PIN at start of recording session. Session timeout 30 min.
- **Pros:** real attribution; HIPAA-friendlier.
- **Cons:** caregivers will share PINs; PIN ≠ strong auth.

**Option C — Per-caregiver login with biometric fallback**
- Real Supabase Auth login per caregiver, then iPad biometrics for repeat sessions.
- **Pros:** strongest.
- **Cons:** highest friction; older family members will not do this.

**RECOMMEND:** start with **B**, with a "this recording captured by [name]" voice confirmation at the end of each entry as a soft-attribution backstop. Reassess after pilot.

`DECIDE:` which of A/B/C, and document the reasoning for the BAA / risk assessment.

### 5.3 Auth pitfalls list (in priority order)

1. **Service role key leakage.** The `service_role` key bypasses RLS. *Never* ship it to the iPad or any browser bundle. It belongs in Edge Functions and server-only Next.js routes (env vars, not `NEXT_PUBLIC_*`). Add a CI grep for the prefix to fail builds that include it client-side.

2. **`@supabase/ssr` cookie handling in Next.js.** Next.js App Router + Supabase cookies has historically been the #1 source of "auth randomly breaks" reports. The fix is using `@supabase/ssr` (not the older `auth-helpers-nextjs`) and following the create-server-client / create-browser-client pattern *exactly*. Cookie writes must happen on the response, not the request. **`ASSUMES:` Next.js 16.2.6 — the AGENTS.md note says APIs may differ; verify the SSR cookie API against `node_modules/next/dist/docs/` before writing the auth glue.**

3. **PKCE flow, not implicit.** Implicit flow leaks tokens via the URL fragment. Configure auth with `flowType: 'pkce'`. Implicit was the default in some older versions — confirm.

4. **Email enumeration on `signInWithPassword`.** A failed login leaks whether an email exists. Mitigations: enable CAPTCHA on the auth endpoints (hCaptcha or Turnstile), set a rate limit, and use generic error copy ("invalid credentials").

5. **MFA enrollment is not on by default.**  `HIPAA` Clinicians must have MFA. Enforce via a check in the app layer: if `role IN ('clinician','admin')` and `aal != 'aal2'`, redirect to MFA enroll. RLS policies for clinical reads should additionally require `auth.jwt() ->> 'aal' = 'aal2'`.

6. **Session timeouts.** HIPAA expects automatic logoff for clinical sessions. Default Supabase JWT is 1 hour; refresh token longer. For clinician web app, set short refresh-token rotation and *also* enforce a 15–30 min idle timeout in the client (no Supabase setting will do this for you).

7. **Email confirmation redirect URLs.** Every redirect URL must be whitelisted in the dashboard (`Authentication → URL Configuration → Redirect URLs`). Adding new ones in code without updating the dashboard breaks confirmation silently.

8. **Recovery / password reset deep links.** Same redirect-URL gotcha. The recovery flow puts a one-time code in the URL — if you're using SSR, the cookie must be set on the same response that consumes the code, or it's lost.

9. **`auth.uid()` returning null in RLS.** Means the JWT didn't make it to Postgres. Common causes: using the service role client (which has no `auth.uid()`), a stale cookie, or the wrong PostgREST connection on the realtime channel.

10. **JWT custom claims for org/team.** Don't put org_id in the JWT directly via the dashboard — use the **Auth Hook (Custom Access Token)** to inject `org_id`, `team_ids`, `clinician_npi` into the JWT at issuance. Then RLS reads `auth.jwt() ->> 'org_id'` instead of joining to a profiles table on every query (huge performance win).

11. **Anonymous sign-ins.** Useful if you go with iPad pattern A. Must be explicitly enabled. Anonymous users count toward MAU. They *do* get a JWT, so RLS still works.

12. **CAPTCHA disabled in dev = forgotten in prod.** Bake CAPTCHA into the dev environment too, with a test key, so the integration is exercised continuously.

13. **Email provider rate limits.** Supabase's built-in email is fine for dev only. **`HIPAA`** Production needs a BAA-covered provider (custom SMTP) — Postmark, SendGrid HIPAA, etc.

14. **Auto-refresh on the iPad.** The iPad app may be backgrounded for hours. When it comes back, the access token is expired. The Supabase client's auto-refresh handles this *if* the refresh token is still valid — but if the device was offline past the refresh-token TTL, the user is logged out. Set refresh-token TTL based on operational reality (caregivers may not log back in for a day).

15. **Realtime auth.** When the JWT refreshes, the existing Realtime connection still has the old JWT. Re-call `supabase.realtime.setAuth(newJwt)` on every refresh — easy to forget; will silently break RLS-filtered subscriptions over time.

16. **Bring-your-own auth fantasy.** Don't try to swap Supabase Auth for Auth0/Clerk/etc. just to "fix auth issues." Most issues come from misconfiguration, not the product. Swapping breaks all the RLS plumbing you just built.

### 5.4 Auth-related schema sketch

```sql
-- Minimal profiles wired to auth.users
create table app.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references app.orgs(id),
  full_name text not null,
  role app.user_role not null,           -- 'patient' | 'caregiver' | 'clinician' | 'admin'
  npi text,                              -- clinicians only
  created_at timestamptz default now()
);

-- Caregivers ↔ patients (many-to-many)
create table app.caregiver_assignments (
  caregiver_id uuid references app.profiles(id),
  patient_id uuid references app.profiles(id),
  relationship text,                     -- 'daughter', 'son', 'spouse', etc.
  active bool default true,
  primary key (caregiver_id, patient_id)
);

-- Clinical team ↔ patients
create table app.care_team_assignments (
  clinician_id uuid references app.profiles(id),
  patient_id uuid references app.profiles(id),
  role_on_team text,                     -- 'primary_md', 'rn', 'sw', etc.
  primary key (clinician_id, patient_id)
);
```

`auth.users` stays vanilla. All app-side identity lives in `app.profiles`.

---

## 6. Schema sketch (rest of it)

This is starting-point only — expect to revise.

```sql
create schema app;
create schema audit;
create schema vector;

-- Orgs (hospice agencies — one per BAA signer typically)
create table app.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Patient demographics (whiteboard: name, birth, sex)
create table app.patients (
  id uuid primary key references app.profiles(id) on delete cascade,
  date_of_birth date not null,
  sex text,
  enrolled_at timestamptz default now(),
  discharged_at timestamptz
);

-- The seven symptoms
create type app.symptom as enum (
  'pain', 'shortness_of_breath', 'nausea_vomiting',
  'anxiety_agitation', 'constipation', 'congestion', 'fever'
);

-- A "symptom event" = one self-report session
create table app.symptom_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references app.patients(id),
  symptom app.symptom not null,
  recorded_by uuid references app.profiles(id),  -- caregiver or patient
  started_at timestamptz default now(),
  closed_at timestamptz                          -- after final follow-up
);

-- Each prompted question → recorded utterance
create table app.utterances (
  id uuid primary key default gen_random_uuid(),
  symptom_event_id uuid not null references app.symptom_events(id) on delete cascade,
  prompt_text text not null,                     -- "How much is your pain?"
  audio_path text not null,                      -- storage path
  transcript text,                               -- filled by STT job
  duration_ms int,
  spoken_at timestamptz default now()
);

-- Scheduled follow-ups (pg_cron consumes this)
create table app.scheduled_followups (
  id uuid primary key default gen_random_uuid(),
  symptom_event_id uuid not null references app.symptom_events(id),
  due_at timestamptz not null,
  prompt_text text not null,
  status text not null default 'pending',        -- 'pending'|'fired'|'completed'|'missed'
  fired_at timestamptz,
  completed_utterance_id uuid references app.utterances(id)
);

-- Doctor / nurse notes attached to events or patients
create table app.notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references app.patients(id),
  symptom_event_id uuid references app.symptom_events(id),
  author_id uuid not null references app.profiles(id),
  body text not null,
  created_at timestamptz default now()
);

-- Embeddings for RAG (vector dim depends on chosen model)
create table vector.utterance_embeddings (
  utterance_id uuid primary key references app.utterances(id) on delete cascade,
  embedding vector(768) not null,
  model text not null,
  created_at timestamptz default now()
);
create index on vector.utterance_embeddings using hnsw (embedding vector_cosine_ops);

-- Append-only audit log (HIPAA: who saw / changed PHI)
create table audit.access_log (
  id bigserial primary key,
  occurred_at timestamptz default now(),
  actor_id uuid,                                  -- profile id; null for anonymous device
  actor_role text,
  action text not null,                           -- 'select'|'insert'|'update'|'delete'|'storage_read'
  table_name text,
  row_id uuid,
  request_id text,                                -- correlate with edge fn / next.js
  ip inet,
  user_agent text
);
revoke all on audit.access_log from public;
```

`DECIDE:` audit.access_log via Postgres triggers (`AFTER INSERT/UPDATE/DELETE` on every PHI table) is reliable but adds write latency. Alternative: log from Edge Functions / Server Actions only. Triggers are stronger for HIPAA defense. Recommend triggers, with one shared trigger function applied per table.

---

## 7. Module decisions to make

| # | Decision | Options | Default lean |
|---|---|---|---|
| 1 | Migrations tool | Supabase CLI / Drizzle / both | Supabase CLI for schema+RLS, Drizzle for query types only |
| 2 | iPad auth pattern | A device-account / B per-caregiver PIN / C full login | **B** for v1 |
| 3 | Hosting | Vercel (needs BAA) / Hostinger VPS / self-host on hospice infra | TBD — depends on BAA cost; self-host is HIPAA-cheapest |
| 4 | Self-host Supabase or use cloud HIPAA add-on | Cloud + add-on / self-hosted on HIPAA infra | Cloud + add-on for v1 (less ops); revisit at scale |
| 5 | STT location | Local (Whisper.cpp) / cloud with BAA | Local — same logic as LLM |
| 6 | Audit logging mechanism | Postgres triggers / app-layer / both | Triggers + app-layer correlation IDs |
| 7 | Audio retention | Keep raw forever / delete after transcript verified | TBD — clinical/legal guidance needed |
| 8 | Notification delivery | Realtime broadcast / APNs push | Both: broadcast for foreground, APNs for background |
| 9 | Field-level encryption for transcripts | pgsodium / app-layer / none (rely on at-rest) | None for v1; rely on BAA + RLS |
| 10 | Realtime payloads | Send full row / send only id then refetch | id-only (RLS-checked refetch) |

---

## 8. What we are explicitly NOT putting in Supabase

- **The LLM.** Stays local. Ollama / GPT-OSS 20B / MCP server runs on the hospice's own infrastructure. PHI never leaves perimeter.
- **STT.** Same reason. `ASSUMES:` Whisper.cpp or similar local STT.
- **Embeddings model inference.** Same reason. Embeddings *vectors* go into pgvector; the model that produced them is local.
- **APNs token signing.** Apple-specific; Edge Function calls APNs but signing key lives in Vault.
- **Email/SMS provider.** External BAA-covered service.

Everything else — schema, auth, files, realtime, scheduling, RAG storage, audit — stays in Supabase.

---

## 9. Pre-launch HIPAA checklist  `HIPAA`

- [ ] BAA signed with Supabase
- [ ] BAA signed with hosting provider (or self-host)
- [ ] BAA signed with email/SMS provider
- [ ] HIPAA add-on enabled on the Supabase project
- [ ] All non-HIPAA Supabase projects isolated from this one
- [ ] MFA enforced on all dashboard / org members
- [ ] MFA required (`aal2`) for clinician role in app + RLS
- [ ] RLS enabled on every table with PHI; default-deny verified
- [ ] RLS test suite (pgTAP) green in CI
- [ ] Storage buckets all private; signed URL TTL ≤ 5 min
- [ ] Audit log table receiving from triggers; retention ≥ 6 yr
- [ ] Log drain configured to long-term archive
- [ ] PITR backups enabled, tested restore
- [ ] No PHI in any `console.log` / Edge Function log path
- [ ] Service role key not in any client bundle; CI guard active
- [ ] Idle timeout enforced in clinician web app (≤ 30 min)
- [ ] Auto-logoff verified on lost-session paths
- [ ] Penetration test / risk assessment scheduled
- [ ] Incident response plan + breach notification process documented
- [ ] Workforce HIPAA training completed before any real PHI

---

## 10. Open questions for the team

1. Who is the BAA signer on the hospice side, and what's the timeline to get the BAA with Supabase + hosting in place?
2. Is the local LLM box already provisioned, or do we need to plan that infra first? (Affects whether v1 ships voice-without-AI and adds AI in v2.)
3. iPad fleet management — MDM (Jamf, etc.) for kiosk mode, remote wipe, automatic OS updates? HIPAA expects this.
4. Are caregivers identified ahead of time in the system (admitted patient → enrolled caregivers list), or self-enrolled at the device?
5. Retention policy for audio vs transcripts — needs clinical + legal input.
6. Do we need a "panic" / urgent-alert path (severe symptom escalation) in v1, or is that v2?
7. How do we handle a patient's death / discharge — soft-delete + retention, or full archive export?
