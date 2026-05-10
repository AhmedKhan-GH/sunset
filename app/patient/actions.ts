"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requirePatient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, user.id));

  if (!patient) redirect("/");
  return patient;
}

export async function getMyPatient() {
  return requirePatient();
}

export async function getMyRelatives() {
  const patient = await requirePatient();
  return db.select().from(relatives).where(eq(relatives.patientId, patient.id));
}

export async function createRelative(formData: FormData) {
  const patient = await requirePatient();

  const name = formData.get("name");
  const relationship = formData.get("relationship");
  if (
    typeof name !== "string" || !name.trim() ||
    typeof relationship !== "string" || !relationship.trim()
  ) return;

  await db.insert(relatives).values({
    patientId: patient.id,
    name: name.trim(),
    relationship: relationship.trim(),
  });

  revalidatePath("/patient");
}
