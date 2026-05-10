"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  exact,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={
        isActive
          ? "border-b-2 border-brand px-3 py-2 text-sm font-semibold text-brand"
          : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      }
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
