import { cn } from "@/lib/cn";

/**
 * The base surface: white, heavily rounded, one soft elevation.
 * Cards are meant to overlap the background blobs and occasionally each other —
 * that overlap is the whole look. A tidy grid of non-overlapping cards reads as
 * a generic dashboard no matter how good the colours are.
 */
export function Card({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card bg-paper shadow-soft p-6",
        className,
      )}
      {...props}
    />
  );
}
