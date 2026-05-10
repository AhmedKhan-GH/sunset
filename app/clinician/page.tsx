import { createClient } from "@/lib/supabase/server";

export default async function ClinicianPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visibility through the user-scoped client = RLS-filtered.
  const { data: visibleOrgs } = await supabase.from("organizations").select("*");
  const { data: visibleProfiles } = await supabase.from("profiles").select("*");

  // Get this user's role (own row only — RLS allows it)
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
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Hi, clinician 👩‍⚕️</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Signed in as <code>{user?.email}</code> · role <code>{ownProfile.role}</code>
      </p>

      <h2 className="mt-8 text-lg font-medium">What you can see (RLS-filtered)</h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li>
          <strong>Organizations visible:</strong> {visibleOrgs?.length ?? 0}{" "}
          <span className="text-zinc-400">
            (expected 0 — only platform_admin can read)
          </span>
        </li>
        <li>
          <strong>Profiles visible:</strong> {visibleProfiles?.length ?? 0}{" "}
          <span className="text-zinc-400">(expected 1 — only your own)</span>
        </li>
      </ul>

      <p className="mt-8 text-xs text-zinc-400">
        Placeholder page. The real clinician dashboard (patient list, RAG search,
        etc.) goes here when Micah/Ahmed build it.
      </p>
    </div>
  );
}
