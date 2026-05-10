import { createClient } from "@/lib/supabase/server";
import { SearchNotes } from "./search-notes";
import { CheckinsFeed } from "./checkins-feed";
import type { Checkin } from "./actions";

export default async function ClinicianPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user?.id ?? "")
    .single();

  if (ownProfile?.role !== "clinician") {
    return (
      <div className="mx-auto w-full max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="mt-2 text-zinc-500">
          This page is for clinicians. You are signed in as{" "}
          <code>{ownProfile?.role ?? "unknown"}</code>.
        </p>
      </div>
    );
  }

  const { data: initialCheckins } = await supabase
    .from("patient_checkins")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(7);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-12 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Clinician dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as <code>{user?.email}</code>
        </p>
        <nav className="mt-3 flex gap-3 text-sm">
          <a href="/clinician" className="font-medium underline">Dashboard</a>
          <a href="/clinician/checkups" className="text-zinc-600 hover:underline dark:text-zinc-300">
            Patient checkups →
          </a>
        </nav>
      </header>

      <CheckinsFeed initial={(initialCheckins ?? []) as Checkin[]} />

      <section className="border-t pt-8">
        <h2 className="text-lg font-medium">Search patient notes</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Search across patient symptom recordings by meaning, not exact words.
        </p>
        <div className="mt-4">
          <SearchNotes />
        </div>
        <p className="mt-8 text-xs text-zinc-400">
          Searching the demo corpus (1001 hospice symptom recordings).
        </p>
      </section>
    </div>
  );
}
