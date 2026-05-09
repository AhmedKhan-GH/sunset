"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { organizations, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  if (!profile || profile.role !== "platform_admin") redirect("/");

  return user;
}

export async function getOrganizations() {
  await requirePlatformAdmin();
  return db.select().from(organizations);
}

export async function createOrganization(formData: FormData) {
  await requirePlatformAdmin();

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim() === "") return;

  await db.insert(organizations).values({ name: name.trim() });
  revalidatePath("/admin");
}
