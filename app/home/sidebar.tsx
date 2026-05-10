import Link from "next/link";
import type { ReactNode } from "react";

type SidebarItem = {
  label: string;
  href: string;
  icon: ReactNode;
  active?: boolean;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "h-5 w-5 shrink-0",
};

const sections: SidebarSection[] = [
  {
    title: "Today",
    items: [
      {
        label: "Dashboard",
        href: "/home",
        active: true,
        icon: (
          <svg {...iconProps}>
            <path d="m3 12 9-9 9 9" />
            <path d="M5 10v10h14V10" />
          </svg>
        ),
      },
      {
        label: "Symptom Check-In",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        ),
      },
      {
        label: "My Medications",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <rect x="3" y="9" width="18" height="6" rx="3" />
            <path d="M12 9v6" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Looking Back",
    items: [
      {
        label: "Symptom Log",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="3.5" cy="6" r="0.5" fill="currentColor" />
            <circle cx="3.5" cy="12" r="0.5" fill="currentColor" />
            <circle cx="3.5" cy="18" r="0.5" fill="currentColor" />
          </svg>
        ),
      },
      {
        label: "Voice Notes",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <path d="M3 12h2l3-9 3 18 3-12 2 6h5" />
          </svg>
        ),
      },
      {
        label: "Visits",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Care Team",
    items: [
      {
        label: "My Hospice Team",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M17 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: "Messages",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        ),
      },
      {
        label: "Care Plan",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <rect x="6" y="4" width="12" height="17" rx="2" />
            <path d="M9 4h6v3H9z" />
            <path d="M9 12h6M9 16h4" />
          </svg>
        ),
      },
      {
        label: "Family Portal",
        href: "/family",
        icon: (
          <svg {...iconProps}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M17 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Comfort",
    items: [
      {
        label: "Family Photos",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        ),
      },
      {
        label: "Music & Stories",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        ),
      },
      {
        label: "Quiet Mode",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Larger Text",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <path d="M4 7V5h16v2" />
            <path d="M9 20h6" />
            <path d="M12 5v15" />
          </svg>
        ),
      },
      {
        label: "How to Use Sunset",
        href: "#",
        icon: (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-col gap-6 p-5"
    >
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {section.title}
          </h2>
          {section.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={
                item.active
                  ? "flex items-center gap-3 rounded-lg bg-brand/10 px-3 py-3 text-base font-semibold text-brand"
                  : "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
              }
            >
              <span className="text-brand">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
