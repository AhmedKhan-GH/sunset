"use client";

import { useState, type ReactNode } from "react";

type Tab = { key: string; label: string; render: ReactNode };

export function PatientDetailTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`relative px-4 py-2 text-sm font-medium transition ${
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-brand"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        {tabs.find((t) => t.key === active)?.render ?? null}
      </div>
    </div>
  );
}
