"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/family" },
  { label: "Activity", href: "/family/activity" },
  { label: "Medications", href: "/family/medications" },
  { label: "Care Team", href: "/family/care-team" },
  { label: "Visits", href: "/family/visits" },
];

export function FamilyTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Family portal sections" className="flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-t-md bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-900"
                : "rounded-t-md px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
