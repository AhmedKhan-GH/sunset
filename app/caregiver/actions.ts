"use server";

import { createClient } from "@/lib/supabase/server";

export type CheckupSubmission = {
  patient_name: string;
  pain_score: number;
  nausea_score: number;
  headache_score: number;
  fatigue_score: number;
  anxiety_score: number;
  shortness_of_breath_score: number;
  notes: string;
};

export async function submitCheckup(input: CheckupSubmission) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Not signed in");

  // user_id is set explicitly; the RLS policy double-checks user_id =
  // auth.uid() AND profile.role = 'caregiver'.
  const { error } = await supabase.from("patient_checkups").insert({
    user_id: user.id,
    patient_name: input.patient_name.trim() || "Patient",
    pain_score: input.pain_score,
    nausea_score: input.nausea_score,
    headache_score: input.headache_score,
    fatigue_score: input.fatigue_score,
    anxiety_score: input.anxiety_score,
    shortness_of_breath_score: input.shortness_of_breath_score,
    notes: input.notes.trim() || null,
  });

  if (error) throw new Error(error.message);
}
