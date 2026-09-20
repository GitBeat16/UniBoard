"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { EASE_SOFT, LAYOUT_SPRING } from "@/lib/motion";
import {
  IconBoard,
  IconHome,
  IconMe,
  IconMoney,
  IconTimetable,
} from "./icons";

// Attendance lives inside Timetable, and the Advisor is reached from a class —
// neither earns a tab. Five is already the ceiling.
const tabs = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/timetable", label: "Timetable", icon: IconTimetable },
  { href: "/board", label: "Board", icon: IconBoard },
  { href: "/money", label: "Money", icon: IconMoney },
  { href: "/me", label: "Me", icon: IconMe },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  // layoutId is page-global; scope it so two navs on one page (the /preview
  // gallery) do not share — and steal — the same sliding pill.
  const pillId = useId();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-4">
      <ul className="flex items-center justify-between rounded-full bg-paper px-2 py-2 shadow-lift">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="relative">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-3 py-2",
                  active ? "text-paper" : "text-muted hover:text-ink",
                )}
              >
                {/* The black pill slides between tabs rather than cutting.
                    layoutId is what makes it one object moving, not two
                    objects fading. */}
                {active && (
                  <motion.span
                    layoutId={`${pillId}-nav-pill`}
                    transition={LAYOUT_SPRING}
                    className="absolute inset-0 rounded-full bg-ink"
                  />
                )}

                <Icon className="relative size-6 shrink-0" />

                {/* The active tab is named, not just tinted — colour is never
                    the only signal. */}
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.28, ease: EASE_SOFT }}
                      className="relative overflow-hidden whitespace-nowrap text-label font-semibold"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                <span className="sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
