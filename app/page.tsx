import Link from "next/link";
import { SunsetLogo } from "@/components/sunset-logo";

export default function WelcomePage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <SunsetLogo className="mb-2 h-44 w-auto" />

        <h1 className="text-5xl font-bold tracking-wide text-foreground">
          SUNSET
        </h1>

        <div className="mt-3 rounded bg-brand px-4 py-1">
          <span className="text-xs font-semibold tracking-[0.25em] text-white">
            COMFORT. DIGNITY. CARE.
          </span>
        </div>

        <h2 className="mt-10 text-3xl font-semibold text-foreground">
          Welcome to Sunset
        </h2>

        <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
          Hospice care designed for comfort at home. Log symptoms with your
          voice, track medications, and stay connected to your care team — any
          time, day or night.
        </p>

        <p className="mt-10 text-base text-muted-foreground">
          Ready to begin?
        </p>

        <Link
          href="/login"
          className="mt-4 w-full max-w-xs rounded-xl bg-brand px-8 py-5 text-center text-lg font-semibold tracking-wide text-white shadow-md transition hover:brightness-110"
        >
          LET&apos;S GO
        </Link>

        <Link
          href="/family"
          className="mt-5 text-base font-medium text-brand hover:underline"
        >
          I&apos;m a family caregiver →
        </Link>
      </main>
    </div>
  );
}
