import { redirect } from "next/navigation";
import {
  listOrgRecentCheckins,
  listOrgPatientsForTrigger,
} from "@/lib/checkins/actions";
import { CheckinsFeed } from "./checkins-feed";

export default async function OrgCheckinsPage() {
  let initial;
  let patients;
  try {
    [initial, patients] = await Promise.all([
      listOrgRecentCheckins(50),
      listOrgPatientsForTrigger(),
    ]);
  } catch {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">Patient check-ins</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live feed of symptom check-ins across the organization. Pending = the
        patient hasn&apos;t filled it out yet. Completed = symptom scores
        submitted, sortable by recency.
      </p>

      <div className="mt-8">
        <CheckinsFeed initial={initial} patients={patients} />
      </div>
    </div>
  );
}
