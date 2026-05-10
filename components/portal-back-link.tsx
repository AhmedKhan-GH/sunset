import Link from "next/link";

type PortalBackLinkProps = {
  href: string;
  label?: string;
};

export function PortalBackLink({
  href,
  label = "Back",
}: PortalBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-soft"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
      >
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h12" />
      </svg>
      {label}
    </Link>
  );
}
