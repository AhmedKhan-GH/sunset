"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { profiles, patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RegisterResult =
  | { success: true }
  | { success: false; error: string };

export async function register(formData: FormData): Promise<RegisterResult> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.trim())
    return { success: false, error: "Email is required." };
  if (typeof password !== "string" || password.length < 6)
    return { success: false, error: "Password must be at least 6 characters." };

  const admin = createAdminClient();
  const trimmedEmail = email.trim().toLowerCase();

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(
    (u) => u.email?.toLowerCase() === trimmedEmail,
  );

  if (existingUser) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, existingUser.id));

    if (!profile)
      return { success: false, error: "Account configuration error. Contact your administrator." };

    if (profile.role === "platform_admin")
      return { success: false, error: "This account cannot be registered this way." };

    await admin.auth.admin.updateUserById(existingUser.id, { password });

    return { success: true };
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.email, trimmedEmail));

  if (patient) {
    if (patient.userId)
      return { success: false, error: "This email is already registered. Try signing in." };

    const { data, error } = await admin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
    });
    if (error) return { success: false, error: error.message };

    await db.insert(profiles).values({
      userId: data.user.id,
      name: patient.name,
      role: "patient",
      organizationId: patient.organizationId,
    });

    await db
      .update(patients)
      .set({ userId: data.user.id })
      .where(eq(patients.id, patient.id));

    return { success: true };
  }

  const [relative] = await db
    .select()
    .from(relatives)
    .where(eq(relatives.email, trimmedEmail));

  if (relative) {
    if (relative.userId)
      return { success: false, error: "This email is already registered. Try signing in." };

    const [linkedPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, relative.patientId));

    if (!linkedPatient)
      return { success: false, error: "Account configuration error. Contact your administrator." };

    const { data, error } = await admin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
    });
    if (error) return { success: false, error: error.message };

    await db.insert(profiles).values({
      userId: data.user.id,
      name: relative.name,
      role: "relative",
      organizationId: linkedPatient.organizationId,
    });

    await db
      .update(relatives)
      .set({ userId: data.user.id })
      .where(eq(relatives.id, relative.id));

    return { success: true };
  }

  return {
    success: false,
    error: "This email is not associated with any account. Contact your care team to be added.",
  };
}
