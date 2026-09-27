import { cn } from "@/lib/cn";

/**
 * Home, before its data arrives.
 *
 * Shaped exactly like the page that is coming — the same grid, the same
 * ticket with its stub, the same notes and tiles — so nothing jumps when it
 * lands. Placeholder blocks are the shape of what they stand in for, not
 * generic bars: a heading is two lines of heading, a ticket has a stub.
 *
 * A server component with no JavaScript of its own, so it appears the instant
 * a link is tapped. The shimmer is CSS and stops under reduced motion.
 */
export function HomeSkeleton() {
  return (
    <div
      className="flex flex-col gap-8"
      role="status"
      aria-live="polite"
      aria-label="Loading your day"
    >
      {/* greeting + Flora */}
      <div className="flex flex-col gap-6 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] @4xl:items-end @4xl:gap-10">
        <div>
          <Bone className="mb-6 h-11 w-36 rounded-xl lg:hidden" />
          <Bone className="h-3 w-40" />
          <Bone className="mt-4 h-9 w-44 @2xl:h-11" />
          <Bone className="mt-2 h-9 w-56 @2xl:h-11" />
        </div>
        <div className="flex items-end gap-2">
          <Bone className="size-16 shrink-0 rounded-full" />
          <Bone className="mb-3 h-16 flex-1 rounded-tile rounded-bl-md" />
        </div>
      </div>

      <div className="flex flex-col gap-8 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] @4xl:items-start @4xl:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          {/* the ticket, stub and all — hung like the real one, so its
              shadow is there before its words are */}
          <div className="ticket-hang">
            <div className="ticket flex min-h-44 overflow-hidden rounded-card bg-paper">
              <div className="flex w-[var(--stub)] shrink-0 flex-col items-center justify-center gap-2 bg-ink/[0.04] p-3">
                <Bone className="h-2.5 w-10" />
                <Bone className="h-9 w-16" />
                <Bone className="h-2.5 w-6" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col border-l-2 border-dashed border-hairline p-5 @2xl:p-6">
                <Bone className="h-3 w-20" />
                {/* Module names usually wrap to two lines on a phone. */}
                <Bone className="mt-3 h-7 w-3/4" />
                <Bone className="mt-1.5 h-7 w-1/2 @2xl:hidden" />
                <Bone className="mt-2 h-3.5 w-2/3" />
                <Bone className="mt-4 h-3.5 w-32" />
                <Bone className="mt-3 h-5 w-28 rounded-chip" />
                {/* Stacked on a phone, side by side once there is room — as the real buttons are. */}
                <div className="mt-auto flex flex-col gap-2 pt-5 @md:flex-row">
                  <Bone className="h-11 w-full rounded-full @md:w-32" />
                  <Bone className="h-11 w-full rounded-full @md:w-28" />
                </div>
              </div>
            </div>
          </div>

          {/* needs you */}
          <div>
            <Bone className="h-3 w-20" />
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-6">
              {[0, 1].map((i) => (
                <li key={i} className="w-[calc(50%-0.5rem)] list-none @2xl:w-44">
                  <Bone className="h-28 w-full rounded-[2px]" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* shortcuts */}
        <div>
          <Bone className="h-3 w-16" />
          <ul className="mt-4 grid grid-cols-2 gap-3 @2xl:grid-cols-4 @4xl:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex flex-col rounded-tile bg-paper p-4 shadow-soft">
                <Bone className="size-12 rounded-full" />
                <Bone className="mt-3 h-4 w-20" />
                <Bone className="mt-2 h-3 w-full" />
                <Bone className="mt-1.5 h-3 w-2/3" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <span className="sr-only">Loading your day…</span>
    </div>
  );
}

/** One placeholder block. Ink at low opacity, so it reads on paper and canvas alike. */
function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-md bg-ink/[0.07] motion-safe:animate-pulse", className)}
    />
  );
}
