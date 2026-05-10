import { createClient } from "@/lib/supabase/server";
import { SearchNotes } from "./search-notes";

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

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Patient notes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Signed in as <code>{user?.email}</code>
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        Search across patient symptom recordings by meaning, not exact words.
        Type how you&apos;d describe what you&apos;re looking for — the search
        understands synonyms and related concepts.
      </p>

      <div className="mt-8">
        <SearchNotes />
      </div>

      <p className="mt-12 text-xs text-zinc-400">
        Searching the demo corpus (1001 hospice symptom recordings). Once
        Chris&apos;s patient/utterance schema lands, this same UI will search
        real patient transcripts.
      </p>
    </div>
  );
}
