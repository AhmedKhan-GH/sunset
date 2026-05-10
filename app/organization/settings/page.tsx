import { getMyOrganization, updateSystemPrompt } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!profile || profile.role !== "organization_admin") redirect("/organization/patients");

  const organization = await getMyOrganization();
  if (!organization) redirect("/");

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">{organization.name}</p>

      <form action={updateSystemPrompt} className="mt-8">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">AI System Prompt</span>
          <p className="text-xs text-zinc-500">
            Instructions given to the AI assistant for all users in your
            organization. Use this to customize tone, focus areas, or
            compliance requirements.
          </p>
          <textarea
            name="systemPrompt"
            rows={8}
            defaultValue={organization.systemPrompt ?? ""}
            placeholder="e.g. Always respond in a compassionate tone. Prioritize pain management and symptom tracking questions. Flag any mention of falls or sudden changes for immediate follow-up."
            className="rounded border px-3 py-2 text-sm"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
