"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

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
  await requireRole("patient");
  const supabase = await createClient();
  const { error } = await supabase
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
      notes: input.notes.trim() || null,
    })
    .eq("id", input.checkinId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
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
