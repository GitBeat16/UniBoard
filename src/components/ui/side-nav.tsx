"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { motion } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { LAYOUT_SPRING } from "@/lib/motion";
import { isActive, tabs } from "./bottom-nav";

/**
 * Laptop navigation: a paper card down the left edge with the same five
 * places as the phone's bottom bar, named in full because there is room.
 * The black pill slides between them exactly as it does on the phone.
 */
export function SideNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const pillId = useId();

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-y-4 left-4 z-20 hidden w-56 flex-col rounded-card bg-paper p-5 shadow-soft lg:flex",
        className,
      )}
    >
      <Link
        href="/"
        className="rounded-chip px-1 pb-6 pt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Logo size={36} />
      </Link>

      <ul className="flex flex-col gap-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-full px-4 py-3 text-body font-semibold",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  active ? "text-paper" : "text-muted hover:bg-ink/5 hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`${pillId}-side-pill`}
                    transition={LAYOUT_SPRING}
                    className="absolute inset-0 rounded-full bg-ink"
                  />
                )}
                <Icon className="relative size-6 shrink-0" />
                <span className="relative">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-auto px-2 text-caption text-muted tnum">
        v{process.env.NEXT_PUBLIC_APP_VERSION}
      </p>
    </nav>
  );
}
