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
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">{organization.name}</p>

      <form action={updateSystemPrompt} className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">AI System Prompt</span>
          <p className="text-xs text-muted-foreground">
            Instructions given to the AI assistant for all users in your
            organization. Use this to customize tone, focus areas, or
            compliance requirements.
          </p>
          <textarea
            name="systemPrompt"
            rows={8}
            defaultValue={organization.systemPrompt ?? ""}
            placeholder="e.g. Always respond in a compassionate tone. Prioritize pain management and symptom tracking questions."
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
