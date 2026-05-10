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
    <nav
      aria-label="Family portal sections"
      className="-mb-px flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "border-b-2 border-brand px-5 py-3 text-sm font-semibold text-brand"
                : "border-b-2 border-transparent px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
