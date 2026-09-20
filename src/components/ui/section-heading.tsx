import { cn } from "@/lib/cn";

/**
 * The signature two-line heading: light first line, bold second.
 *   Hello,          /  Srushti
 *   Mathematics     /  Lesson
 * Used on almost every screen. Keeping it as one component is what stops the
 * 15 screens drifting apart.
 */
export function SectionHeading({
  light,
  bold,
  size = "display",
  className,
}: {
  light: string;
  bold: string;
  size?: "display" | "h1" | "h2";
  className?: string;
}) {
  const sizes = {
    display: "text-display",
    h1: "text-h1",
    h2: "text-h2",
  } as const;

  return (
    <h1 className={cn(sizes[size], "text-ink", className)}>
      <span className="block font-normal">{light}</span>
      <span className="block font-bold">{bold}</span>
    </h1>
  );
}
