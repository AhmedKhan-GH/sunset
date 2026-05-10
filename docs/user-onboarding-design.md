# User Onboarding Design Report

## Current State

All downstream users are created top-down by upstream users. The platform has no self-registration or invitation flow. When an organization admin creates a practitioner, the system generates a Supabase auth account with a hardcoded temporary password (`changeme123`). Patients and relatives are created as data records with optional email fields, but no auth account is provisioned for them.

This means:
- Practitioners receive credentials out-of-band (verbally, sticky note, etc.)
- Patients and relatives with emails in the system have no way to activate portal access
- There is no password reset, no email verification, and no invitation mechanism

## Industry Standard: Magic Link Invitation Flow

The standard approach for healthcare platforms (and most B2B SaaS with admin-provisioned users) is an **email invitation flow**:

1. **Admin creates the user record** (practitioner, patient, or relative) with their email address
2. **System sends a magic link** to that email (a one-time-use, time-limited URL)
3. **User clicks the link**, which verifies their email and lands them on a "Set Your Password" page
4. **User sets their own password**, completing account activation
5. **Future logins** use standard email/password

This is the flow used by Epic MyChart, Athenahealth, and most Supabase-based apps.

## Supabase Implementation Path

Supabase Auth natively supports this via `inviteUserByEmail`:

```
supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'https://app.example.com/accept-invite'
})
```

This:
- Creates the auth user in a "pending" state
- Sends an email with a confirmation link
- User clicks link, is redirected to your app with a session
- App prompts them to set a password

### Alternative: Magic Link Login (Passwordless)

Instead of password setup, the user could simply use magic links to log in every time. This eliminates password management entirely and is common in patient-facing healthcare portals.

```
supabase.auth.signInWithOtp({ email })
```

## Proposed Flow by Role

### Practitioners

| Step | Actor | Action |
|------|-------|--------|
| 1 | Org Admin | Fills out practitioner form (name, email, specialty, NPI) |
| 2 | System | Creates profile + practitioner record. Calls `inviteUserByEmail`. |
| 3 | Practitioner | Receives email: "You've been added to [Org Name] on Sunset" |
| 4 | Practitioner | Clicks link, lands on `/accept-invite` page |
| 5 | Practitioner | Sets password, account is active |

### Patients

| Step | Actor | Action |
|------|-------|--------|
| 1 | Practitioner | Creates patient record with optional email |
| 2 | Practitioner | Later, clicks "Invite to Portal" on patient detail page |
| 3 | System | Creates auth user, sends invitation email |
| 4 | Patient | Receives email: "Your care team has invited you to Sunset" |
| 5 | Patient | Clicks link, sets password, can now view notes and chat |

Patients without an email remain as data-only records (no portal access). Portal invitation is a separate, explicit action.

### Relatives

| Step | Actor | Action |
|------|-------|--------|
| 1 | Practitioner or Patient | Adds relative with optional email |
| 2 | Actor | Clicks "Invite to Portal" on relative row |
| 3 | System | Creates auth user, sends invitation email |
| 4 | Relative | Receives email: "You've been invited to view [Patient]'s care on Sunset" |
| 5 | Relative | Clicks link, sets password, can now view linked patient's notes |

## Required Changes

### New Pages

- **`/accept-invite`** - Landing page after clicking invitation link. Reads the session from the URL token, prompts user to set a password via `supabase.auth.updateUser({ password })`.

### Modified Server Actions

- **`createPractitioner`** - Replace `admin.createUser({ password: 'changeme123' })` with `admin.inviteUserByEmail(email, { redirectTo, data: { role, organizationId } })`.
- **`createPatient` / `createRelative`** - Keep the current flow (data record only). Add a new `inviteToPortal(userId, email)` action that provisions the auth account and sends the invite.

### New Server Actions

- **`invitePatientToPortal(patientId)`** - Creates auth user for an existing patient record, links `patients.userId`, sends invitation.
- **`inviteRelativeToPortal(relativeId)`** - Same for relatives.
- **`resetPassword(email)`** - Sends password reset email via `supabase.auth.resetPasswordForEmail(email)`.

### Email Configuration

Supabase local development uses Inbucket (bundled email server at `http://localhost:54324`). No SMTP setup needed for dev. For production, configure a real SMTP provider in Supabase dashboard.

### UI Additions

- "Invite to Portal" button on patient detail page (next to patients with email but no userId)
- "Invite to Portal" button on relative rows (same condition)
- Password reset link on the login page
- Invitation status indicator (pending/active) on user lists

## Security Considerations

- Invitation links should expire after 24-48 hours (Supabase default is 24h)
- Password requirements: minimum 8 characters (Supabase default)
- Rate limit invitation sends to prevent email spam
- Log invitation events in the audit trail (`invitation.sent`, `invitation.accepted`)
- Invitation links are single-use (Supabase enforces this)

## Decision Points

1. **Magic link vs. password**: Should patients use passwordless magic links (simpler, no password to forget) or set a password (works offline, more familiar)?
2. **Auto-invite on create**: Should adding an email to a patient/relative automatically send an invitation, or should it be a separate "Invite" action?
3. **Re-invitation**: Should admins be able to resend invitations if the original expires?
