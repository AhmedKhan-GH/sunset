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
      className={isActive ? "font-medium underline" : "hover:underline"}
    >
      {children}
    </Link>
  );
}
