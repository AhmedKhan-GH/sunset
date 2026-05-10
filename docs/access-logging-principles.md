# Access Logging Principles

**Context:** HIPAA compliance relies on audit trails, not access denial. Practitioners have org-wide read access under the treatment exception — the audit log proves access was appropriate after the fact.

---

## Core Principles

### 1. Log every PHI access, not just mutations

Every SELECT on patient data must be recorded. HIPAA auditors ask "who looked at this record and when," not just "who changed it." Read access is the primary audit surface.

### 2. Append-only, tamper-evident

Audit records cannot be updated or deleted by any application role. The audit schema should be owned by a service role with no DELETE/UPDATE grants to application users. If a log entry is wrong, you append a correction — never modify history.

### 3. Capture actor, action, context

Each log entry must include:
- **Who** — user ID, role at time of access, organization
- **What** — table, row ID, which fields were accessed or changed
- **When** — server-side timestamp (not client-provided)
- **How** — action type (SELECT, INSERT, UPDATE), request path or operation name
- **Why** (where available) — the feature or workflow that triggered access (search query, patient detail view, report generation)

### 4. Log at the data layer, not the application layer

Application-level logging can be bypassed or forgotten. Use database triggers and RLS hooks so that any path to the data — API, admin console, direct query — is captured. The database is the single source of truth.

### 5. Separate schema, separate permissions

Audit tables live in their own schema (`audit`). Application roles have INSERT-only access to the audit log. Only a dedicated audit/compliance role can read logs. This prevents practitioners from viewing their own access trail (which could enable covering tracks).

### 6. Retain indefinitely

HIPAA requires 6-year minimum retention for access logs. Design for indefinite retention with time-based partitioning for query performance. Never auto-purge audit data.

### 7. Index for compliance queries

Common audit queries that must be fast:
- All access to a specific patient's records (patient complaint investigation)
- All records accessed by a specific user (termination audit)
- All access during a time window (breach investigation)
- All failed access attempts (security monitoring)

### 8. Alert on anomalies, don't block

Unusual patterns (bulk access, off-hours access, accessing patients outside normal caseload) should trigger alerts for compliance review — not block access. Blocking could impede emergency care. The practitioner acts; compliance reviews.

---

## What Gets Logged

| Data Category | Access Type | Logged |
|---------------|------------|--------|
| Patient notes | Read (search, view) | Yes |
| Patient notes | Insert | Yes |
| Patient demographics | Read | Yes |
| Patient demographics | Update | Yes |
| Practitioner profiles | Read | No (not PHI) |
| Organization metadata | Read/Write | No (not PHI) |
| Auth events | Login, logout, failed attempts | Yes |

---

## Implementation Phases

1. **Database triggers** — automatic INSERT/UPDATE/DELETE logging on PHI tables (Phase 6 of integration plan)
2. **Application-level read logging** — server actions log SELECT operations to the audit table before returning data
3. **Anomaly detection** — scheduled query identifying unusual access patterns, surfaced to org admins
4. **Compliance dashboard** — org admin view of access logs with export capability for auditors
