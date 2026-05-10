import Link from "next/link";
import { PortalBackLink } from "@/components/portal-back-link";
import { SunsetLogo } from "@/components/sunset-logo";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Patients", href: "/admin/patients" },
  { label: "Care Staff", href: "/admin/staff" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Audit Log", href: "/admin/audit" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <PortalBackLink href="/login" label="Back" />
            <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
            <Link href="/admin" className="flex items-center gap-3">
              <SunsetLogo gradientId="adminLogo" className="h-8 w-auto" />
              <span className="text-lg font-bold tracking-wider text-slate-900">
                SUNSET
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Admin
              </span>
            </Link>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Organization
              </div>
              <div className="text-sm font-medium leading-tight text-slate-900">
                Admin Portal
              </div>
            </div>
            <div
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
            >
              A
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        {children}
      </main>
    </div>
  );
}
