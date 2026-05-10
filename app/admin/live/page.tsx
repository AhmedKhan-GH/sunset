import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LiveFeed } from "./live-feed";

export default async function AdminLivePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "platform_admin") {
    return (
      <div className="mx-auto w-full max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
      </div>
    );
  }

  const { data: initialOrgs } = await supabase.from("organizations").select("*");

  return <LiveFeed initialOrgs={initialOrgs ?? []} />;
}
