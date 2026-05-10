"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getLoginRedirect(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/";

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  if (profile) {
    switch (profile.role) {
      case "platform_admin":
        return "/admin";
      case "organization_admin":
        return "/organization";
      case "practitioner":
        return "/organization/patients";
    }
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, user.id));
  if (patient) return "/patient";

  const [relative] = await db
    .select()
    .from(relatives)
    .where(eq(relatives.userId, user.id));
  if (relative) return "/relative";

  return "/";
}
