import { ShapeFrame } from "@/components/board/card-shape";
import { Pin } from "@/components/board/pin";
import { IconAdvisor, IconBoard, IconMoney, IconTimetable } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const FEATURES = [
  { icon: IconTimetable, title: "Timetable in", text: "A calendar link, a file, or a photo of the grid." },
  { icon: IconAdvisor, title: "Go or skip?", text: "An honest call that shows its working." },
  { icon: IconBoard, title: "A board of your own", text: "Hand-ins, exams and campus events, pinned." },
  { icon: IconMoney, title: "Money that adds up", text: "What today can take, and food a short walk away." },
] as const;

/**
 * The laptop-width companion to the sign-in card: what UniBoard is, before
 * anyone is asked for an email. Hidden below lg, where the card alone fits.
 */
export function SignInHero({ className }: { className?: string }) {
  return (
    <section className={cn("max-w-xl", className)}>
      <p className="text-caption font-semibold uppercase text-ink/80">For students</p>
      <h2 className="mt-3 text-[2.75rem] leading-[1.05] tracking-tight">
        <span className="block font-normal">Everything with a date on it,</span>
        <span className="block font-bold">pinned in one place.</span>
      </h2>

      <ul className="mt-10 grid grid-cols-2 gap-x-8 gap-y-7">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-paper shadow-soft">
              <Icon className="size-6" />
            </span>
            <span>
              <span className="block text-body font-semibold">{title}</span>
              <span className="mt-0.5 block text-label text-ink/75">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* A small piece of the real board, so the promise has a picture. */}
      <div className="board-frame mt-12 w-[26rem]" aria-hidden="true">
        <div className="felt flex items-start justify-center gap-6 px-6 pb-7 pt-9">
          <Mini shape="index" tone="sky" tilt={-3} kicker="Hand-in" title="DBMS assignment" when="Tomorrow, 11:59 PM" />
          <Mini shape="polaroid" tone="iris" tilt={2.5} kicker="Event" title="Hackathon kickoff" when="Wed, 5:00 PM" />
          <Mini shape="sticky" tone="sun" tilt={-1.5} kicker="Errand" title="Buy lab journal" when="Today" />
        </div>
      </div>
    </section>
  );
}

function Mini({
  shape,
  tone,
  tilt,
  kicker,
  title,
  when,
}: {
  shape: "index" | "polaroid" | "sticky";
  tone: "sky" | "iris" | "sun";
  tilt: number;
  kicker: string;
  title: string;
  when: string;
}) {
  const color = `var(--color-${tone})`;
  return (
    <div
      className="card-hang relative w-28"
      style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "50% 0", ["--tone" as string]: color }}
    >
      <ShapeFrame shape={shape}>
        {shape === "polaroid" && <div className="card-photo mb-1.5" />}
        <p className="text-[0.55rem] font-bold uppercase tracking-wider text-ink/60">{kicker}</p>
        <p className="text-[0.72rem] font-bold leading-tight">{title}</p>
        <p className="mt-0.5 text-[0.6rem] text-ink/70">{when}</p>
      </ShapeFrame>
      <Pin tone={color} style={{ left: "calc(50% - 11px)", top: -9 }} />
    </div>
  );
}
