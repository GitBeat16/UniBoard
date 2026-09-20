import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * Honest placeholder. Every tab is reachable from P0 so the shell is real, but
 * nothing pretends to hold data it does not have.
 */
export function PhasePlaceholder({
  light,
  bold,
  phase,
  what,
}: {
  light: string;
  bold: string;
  phase: string;
  what: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading light={light} bold={bold} />
      <Card>
        <p className="text-caption font-semibold uppercase text-muted">
          {phase}
        </p>
        <p className="mt-3 text-body text-muted">{what}</p>
      </Card>
    </div>
  );
}
