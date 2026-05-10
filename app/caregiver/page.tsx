import { createClient } from "@/lib/supabase/server";
import { CheckupForm } from "./checkup-form";

export default async function CaregiverPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user?.id ?? "")
    .single();

  if (ownProfile?.role !== "caregiver") {
    return (
      <div className="mx-auto w-full max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="mt-2 text-zinc-500">
          This page is for caregivers. You are signed in as{" "}
          <code>{ownProfile?.role ?? "unknown"}</code>.
        </p>
      </div>
    );
  }

  // Default the patient name to whatever's before the @ in their email.
  const defaultName = (user?.email ?? "Patient").split("@")[0];

  return (
    <div className="mx-auto w-full max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Patient checkup</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Signed in as <code>{user?.email}</code>
      </p>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Press the button to start a quick checkup. You&apos;ll rate six common
        symptoms on a 0&ndash;10 scale. Takes about a minute. Your nurse sees
        the results immediately.
      </p>

      <div className="mt-8">
        <CheckupForm defaultName={defaultName} />
      </div>
    </div>
  );
}
