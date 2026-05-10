# Patient Notes Access Model

**Table:** `public.patient_notes`  
**Pattern:** Append-only (immutable clinical record)  
**PHI:** Yes — platform_admin has zero access

---

## Read Access (SELECT)

| Role | Scope |
|------|-------|
| organization_admin | All notes within their organization |
| practitioner | All notes within their organization |
| patient | Notes on their own patient record |
| relative | Notes on their linked patient's record |
| platform_admin | **No access** |

---

## Write Access (INSERT only)

| Role | Can write notes about |
|------|----------------------|
| practitioner | Any patient in their organization |
| patient | Themselves |
| relative | Their linked patient |

All inserts enforce `author_id = auth.uid()`.

---

## No Update or Delete

Nobody can modify or delete a note once written. This ensures:
- Immutable audit trail for clinical records
- HIPAA-compliant record retention
- No tampering with historical observations

---

## Rationale

- **Platform admin excluded:** They own the Sunset platform, not the medical data. PHI visibility is restricted to care teams and the individuals involved.
- **Append-only:** Clinical notes are legal medical records. Edits would undermine trust and compliance.
- **Patients and relatives can write:** Self-reporting and caregiver observations are first-class data. A relative noting "Mom seemed confused this morning" is clinically valuable alongside practitioner notes.
- **Organization-scoped reads for staff:** Practitioners and org admins see all notes within their organization to support collaborative care.
