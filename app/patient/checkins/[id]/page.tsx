import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getMyCheckin } from "@/lib/checkins/actions";
import { CheckinForm } from "../checkin-form";

export default async function PatientCheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let checkin;
  try {
    checkin = await getMyCheckin(id);
  } catch {
    redirect("/");
  }
  if (!checkin) notFound();

  if (checkin.status === "completed") {
    return (
      <div className="mx-auto w-full max-w-2xl p-8">
        <Link
          href="/patient/checkins"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Check-ins
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">
          Check-in already completed
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You submitted this check-in on{" "}
          {checkin.completed_at
            ? new Date(checkin.completed_at).toLocaleString()
            : "an earlier date"}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <Link
        href="/patient/checkins"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Check-ins
      </Link>
      <h1 className="mt-4 text-2xl font-semibold capitalize">
        {checkin.scheduled_kind} check-in
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Rate each symptom on a 0–10 scale. Takes about a minute.
      </p>

      <div className="mt-8">
        <CheckinForm checkinId={checkin.id} />
      </div>
    </div>
  );
}
