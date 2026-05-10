"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

async function requireRelative() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [relative] = await db
    .select()
    .from(relatives)
    .where(eq(relatives.userId, user.id));

  if (!relative) redirect("/");
  return relative;
}

export async function getMyRelativeRow() {
  return requireRelative();
}

export async function getRelatedPatient() {
  const relative = await requireRelative();
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, relative.patientId));
  return patient;
}
