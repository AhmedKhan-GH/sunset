import { createClient } from "@/lib/supabase/server";
import { CheckupsFeed, type Checkup } from "./checkups-feed";

export default async function ClinicianCheckupsPage() {
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
      </div>
    );
  }

  const { data: initial } = await supabase
    .from("patient_checkups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Patient checkups</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Live feed of patient self-reported symptoms. Updates appear automatically
        as patients submit on their devices.
      </p>

      <div className="mt-8">
        <CheckupsFeed initial={(initial ?? []) as Checkup[]} />
      </div>
    </div>
  );
}
