import { cn } from "@/lib/cn";
import type { CardShape } from "@/lib/board/items";

/**
 * The paper a card is written on. Content is shared; only the frame changes,
 * so every shape carries the same information. Styles live in globals.css
 * (.card-index, .card-sticky, …) and read the card's tone from --tone.
 */
export function ShapeFrame({
  shape,
  className,
  children,
}: {
  shape: CardShape;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("card-shape", `card-${shape}`, className)}>
      {shape === "sticky" && <span className="card-fold" aria-hidden="true" />}
      {shape === "tag" && <span className="card-hole" aria-hidden="true" />}
      {children}
    </div>
  );
}
