"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Caseload", href: "/practitioner" },
  { label: "Alerts", href: "/practitioner/alerts", badge: 3 },
  { label: "Today", href: "/practitioner/today", badge: 3 },
  { label: "Notes", href: "/practitioner/notes" },
];

export function PractitionerTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Practitioner sections"
      className="-mb-px flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/practitioner"
            ? pathname === "/practitioner"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "flex items-center gap-2 border-b-2 border-brand px-5 py-3 text-sm font-semibold text-brand"
                : "flex items-center gap-2 border-b-2 border-transparent px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            }
          >
            {tab.label}
            {tab.badge != null && (
              <span
                className={
                  isActive
                    ? "rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white"
                    : "rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700"
                }
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
