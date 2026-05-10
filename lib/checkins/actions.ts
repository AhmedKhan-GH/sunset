"use server";

import { createClient } from "@/lib/supabase/server";
import { db, sql } from "@/lib/db";
import { profiles, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

// ── Types ─────────────────────────────────────────────────────────────────

export type Checkin = {
  id: string;
  patient_id: string;
  organization_id: string;
  scheduled_at: string;
  scheduled_kind: "morning" | "evening" | "manual";
  status: "pending" | "completed" | "skipped";
  completed_at: string | null;
  pain_score: number | null;
  nausea_score: number | null;
  shortness_of_breath_score: number | null;
  anxiety_score: number | null;
  fatigue_score: number | null;
  appetite_score: number | null;
  mood_score: number | null;
  sleep_score: number | null;
  notes: string | null;
  created_at: string;
};

export type CheckinWithPatient = Checkin & {
  patient_name: string;
};

export type SymptomScores = {
  pain_score: number;
  nausea_score: number;
  shortness_of_breath_score: number;
  anxiety_score: number;
  fatigue_score: number;
  appetite_score: number;
  mood_score: number;
  sleep_score: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

async function requireRole(...allowed: string[]) {
  const user = await requireUser();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));
  if (!profile || !allowed.includes(profile.role)) {
    throw new Error(`Not authorized — required one of: ${allowed.join(", ")}`);
  }
  return { user, profile };
}

function rowToCheckin(r: Record<string, unknown>): Checkin {
  const toIso = (v: unknown) =>
    v instanceof Date ? v.toISOString() : (v as string | null);
  return {
    id: r.id as string,
    patient_id: r.patient_id as string,
    organization_id: r.organization_id as string,
    scheduled_at: toIso(r.scheduled_at) as string,
    scheduled_kind: r.scheduled_kind as Checkin["scheduled_kind"],
    status: r.status as Checkin["status"],
    completed_at: toIso(r.completed_at),
    pain_score: r.pain_score as number | null,
    nausea_score: r.nausea_score as number | null,
    shortness_of_breath_score: r.shortness_of_breath_score as number | null,
    anxiety_score: r.anxiety_score as number | null,
    fatigue_score: r.fatigue_score as number | null,
    appetite_score: r.appetite_score as number | null,
    mood_score: r.mood_score as number | null,
    sleep_score: r.sleep_score as number | null,
    notes: (r.notes as string | null) ?? null,
    created_at: toIso(r.created_at) as string,
  };
}

// ── Patient-side actions ─────────────────────────────────────────────────

export async function listMyPendingCheckins(): Promise<Checkin[]> {
  await requireRole("patient");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("symptom_checkins")
    .select("*")
    .eq("status", "pending")
    .order("scheduled_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToCheckin);
}

export async function getMyCheckinSummary(): Promise<{
  pendingCount: number;
  lastCompleted: Checkin | null;
}> {
  await requireRole("patient");
  const supabase = await createClient();
  const [pendingRes, completedRes] = await Promise.all([
    supabase
      .from("symptom_checkins")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("symptom_checkins")
      .select("*")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    pendingCount: pendingRes.count ?? 0,
    lastCompleted: completedRes.data ? rowToCheckin(completedRes.data) : null,
  };
}

export async function listMyRecentCompletedCheckins(limit = 10): Promise<Checkin[]> {
  await requireRole("patient");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("symptom_checkins")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToCheckin);
}

export async function getMyCheckin(checkinId: string): Promise<Checkin | null> {
  await requireRole("patient");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("symptom_checkins")
    .select("*")
    .eq("id", checkinId)
    .single();
  if (error) return null;
  return data ? rowToCheckin(data) : null;
}

export async function submitCheckin(input: {
  checkinId: string;
  scores: SymptomScores;
  notes: string;
}): Promise<void> {
  const { user } = await requireRole("patient");
  const supabase = await createClient();
  const trimmedNotes = input.notes.trim() || null;

  // 1. Update the checkin row with scores + notes
  const { data: updated, error } = await supabase
    .from("symptom_checkins")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      pain_score: input.scores.pain_score,
      nausea_score: input.scores.nausea_score,
      shortness_of_breath_score: input.scores.shortness_of_breath_score,
      anxiety_score: input.scores.anxiety_score,
      fatigue_score: input.scores.fatigue_score,
      appetite_score: input.scores.appetite_score,
      mood_score: input.scores.mood_score,
      sleep_score: input.scores.sleep_score,
      notes: trimmedNotes,
    })
    .eq("id", input.checkinId)
    .eq("status", "pending")
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (!updated) return;

  // 2. Mirror into patient_notes so the practitioner sees it on the
  //    notes feed and the RAG/chat can surface it. Embeds the content.
  const scoreSummary = [
    `pain ${input.scores.pain_score}`,
    `nausea ${input.scores.nausea_score}`,
    `SOB ${input.scores.shortness_of_breath_score}`,
    `anxiety ${input.scores.anxiety_score}`,
    `fatigue ${input.scores.fatigue_score}`,
    `appetite ${input.scores.appetite_score}`,
    `mood ${input.scores.mood_score}`,
    `sleep ${input.scores.sleep_score}`,
  ].join(", ");

  const noteContent = trimmedNotes
    ? `[${updated.scheduled_kind} check-in] ${scoreSummary}. Patient says: "${trimmedNotes}"`
    : `[${updated.scheduled_kind} check-in] ${scoreSummary}.`;

  const embedding = await embedText(noteContent);
  const vec = vectorLiteral(embedding);

  await sql`
    insert into public.patient_notes
      (organization_id, patient_id, author_id, content, embedding)
    values
      (${updated.organization_id}, ${updated.patient_id}, ${user.id}, ${noteContent}, ${vec}::vector)
  `;
}

/**
 * submitCheckin + server-side redirect to the listing page. Use this from
 * the form so the client navigation happens via a 303 redirect rather than
 * router.push() inside useTransition (which can leave the pending state
 * stuck if router.refresh is also called).
 */
export async function submitCheckinAndRedirect(input: {
  checkinId: string;
  scores: SymptomScores;
  notes: string;
}): Promise<never> {
  await submitCheckin(input);
  redirect("/patient/checkins");
}

/**
 * Patient's preferred morning + evening check-in times (stored as UTC).
 * The dispatcher cron job (every 15 min) reads these and creates pending
 * check-ins when they match.
 */
export type CheckinSchedule = {
  morning_checkin_time: string; // "HH:MM" — UTC
  evening_checkin_time: string; // "HH:MM" — UTC
};

function timeToHHMM(t: unknown): string {
  if (typeof t !== "string") return "08:00";
  // Postgres returns "HH:MM:SS" — strip seconds for the form.
  return t.slice(0, 5);
}

export async function getMyCheckinSchedule(): Promise<CheckinSchedule> {
  const { user } = await requireRole("patient");
  const rows = await sql<{ morning_checkin_time: unknown; evening_checkin_time: unknown }[]>`
    select morning_checkin_time, evening_checkin_time
      from public.patients
     where user_id = ${user.id}
     limit 1
  `;
  return {
    morning_checkin_time: timeToHHMM(rows[0]?.morning_checkin_time ?? "08:00"),
    evening_checkin_time: timeToHHMM(rows[0]?.evening_checkin_time ?? "20:00"),
  };
}

export async function updateMyCheckinSchedule(input: CheckinSchedule): Promise<void> {
  const { user } = await requireRole("patient");
  const morning = input.morning_checkin_time;
  const evening = input.evening_checkin_time;
  if (!/^\d{2}:\d{2}$/.test(morning) || !/^\d{2}:\d{2}$/.test(evening)) {
    throw new Error("Times must be in HH:MM format");
  }
  await sql`
    update public.patients
       set morning_checkin_time = ${morning}::time,
           evening_checkin_time = ${evening}::time
     where user_id = ${user.id}
  `;
}

/**
 * Patient-initiated check-in. Creates a pending checkin row for the
 * calling patient (kind='manual') and returns its id so the UI can
 * navigate straight to the form.
 */
export async function startSelfCheckin(): Promise<{ id: string }> {
  const { user, profile } = await requireRole("patient");
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, user.id));
  if (!patient) throw new Error("No patient record found for this user");

  // A patient can have at most one pending check-in at a time (enforced
  // by a unique partial index in the DB). If one already exists, return
  // its id so the UI navigates to it instead of hitting the constraint.
  const existing = await sql<{ id: string }[]>`
    select id from public.symptom_checkins
     where patient_id = ${patient.id} and status = 'pending'
     limit 1
  `;
  if (existing.length > 0) return { id: existing[0].id };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("symptom_checkins")
    .insert({
      patient_id: patient.id,
      organization_id: patient.organizationId,
      scheduled_at: new Date().toISOString(),
      scheduled_kind: "manual",
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

// ── Practitioner / org admin actions ─────────────────────────────────────

export async function listOrgRecentCheckins(limit = 50): Promise<CheckinWithPatient[]> {
  const { profile } = await requireRole("practitioner", "organization_admin");
  if (!profile.organizationId) return [];

  const rows = await sql<Record<string, unknown>[]>`
    select
      c.id,
      c.patient_id,
      c.organization_id,
      c.scheduled_at,
      c.scheduled_kind,
      c.status,
      c.completed_at,
      c.pain_score,
      c.nausea_score,
      c.shortness_of_breath_score,
      c.anxiety_score,
      c.fatigue_score,
      c.appetite_score,
      c.mood_score,
      c.sleep_score,
      c.notes,
      c.created_at,
      p.name as patient_name
    from public.symptom_checkins c
    join public.patients p on p.id = c.patient_id
    where c.organization_id = ${profile.organizationId}
    order by
      case when c.status = 'completed' then c.completed_at else c.scheduled_at end desc
    limit ${limit}
  `;
  return rows.map((r) => ({
    ...rowToCheckin(r),
    patient_name: r.patient_name as string,
  }));
}

export async function listPatientCheckins(
  patientId: string,
  limit = 20,
): Promise<Checkin[]> {
  const { profile } = await requireRole("practitioner", "organization_admin");
  if (!profile.organizationId) return [];

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));
  if (!patient || patient.organizationId !== profile.organizationId) {
    throw new Error("Patient not in your organization");
  }

  const rows = await sql<Record<string, unknown>[]>`
    select * from public.symptom_checkins
     where patient_id = ${patientId}
       and organization_id = ${profile.organizationId}
     order by
       case when status = 'completed' then completed_at else scheduled_at end desc
     limit ${limit}
  `;
  return rows.map(rowToCheckin);
}

export async function listOrgPatientsForTrigger(): Promise<{ id: string; name: string }[]> {
  const { profile } = await requireRole("practitioner", "organization_admin");
  if (!profile.organizationId) return [];
  const rows = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(eq(patients.organizationId, profile.organizationId));
  return rows;
}

export async function triggerManualCheckin(patientId: string): Promise<{ id: string }> {
  const { profile } = await requireRole("practitioner", "organization_admin");
  if (!profile.organizationId) throw new Error("No organization");

  // Verify patient is in caller's org
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));
  if (!patient || patient.organizationId !== profile.organizationId) {
    throw new Error("Patient not found in your organization");
  }

  // A patient can have at most one pending check-in at a time (enforced
  // by a unique partial index in the DB). Bail out cleanly if one
  // already exists rather than letting the constraint fire.
  const existing = await sql<{ id: string }[]>`
    select id from public.symptom_checkins
     where patient_id = ${patientId} and status = 'pending'
     limit 1
  `;
  if (existing.length > 0) {
    throw new Error("Patient already has a pending check-in");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("symptom_checkins")
    .insert({
      patient_id: patientId,
      organization_id: profile.organizationId,
      scheduled_at: new Date().toISOString(),
      scheduled_kind: "manual",
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}
