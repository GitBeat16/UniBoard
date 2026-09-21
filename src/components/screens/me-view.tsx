"use client";

import { useActionState, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { FloraSays } from "@/components/flora/flora-says";
import { setFloraEnabled, useFloraEnabled } from "@/lib/flora/preference";
import { SketchRing } from "@/components/charts/sketch-ring";
import { UniversityField } from "@/components/me/university-field";
import { AnimatedNumber, Rise, Stagger } from "@/components/ui/motion-primitives";
import { PillButton } from "@/components/ui/pill-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";
import { EASE_SOFT, SOFT_SPRING, press } from "@/lib/motion";
import {
  addGoal,
  archiveGoal,
  regenerateCalendarToken,
  saveProfile,
  setGoalProgress,
  upgradeAccount,
  type ActionState,
} from "@/app/(app)/me/actions";

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

export type GoalVM = {
  id: string;
  title: string;
  kind: "habit" | "project";
  targetPerWeek: number | null;
  progress: number;
};

export type ProfileVM = {
  displayName: string;
  universityId: string | null;
  universityName: string;
  universityShort: string | null;
  threshold: number;
  attendanceMonitored: boolean;
  travelMinutes: number | null;
};

export function MeView({
  profile,
  goals,
  isGuest = false,
  feedUrl = null,
}: {
  profile: ProfileVM;
  goals: GoalVM[];
  isGuest?: boolean;
  feedUrl?: string | null;
}) {
  const [profileState, profileAction, savingProfile] = useActionState<ActionState, FormData>(
    saveProfile,
    null,
  );
  const [goalState, goalAction, addingGoal] = useActionState<ActionState, FormData>(
    addGoal,
    null,
  );
  const [threshold, setThreshold] = useState(String(profile.threshold));
  const [thresholdTouched, setThresholdTouched] = useState(false);

  return (
    <Stagger className="flex flex-col gap-8">
      <Rise>
        <SectionHeading light="Your" bold="profile" />
      </Rise>

      <Rise>
        <FloraSays
          context={{
            screen: "me",
            hasTimetable: true,
            isGuest,
            goalCount: goals.length,
          }}
        />
      </Rise>

      {isGuest && (
        <Rise>
          <UpgradeCard />
        </Rise>
      )}

      <Rise>
        <Card>
          <p className="text-caption font-semibold uppercase text-muted">You and your uni</p>
          <form action={profileAction} className="mt-4 flex flex-col gap-3">
            <input
              name="displayName"
              required
              defaultValue={profile.displayName}
              placeholder="Your name"
              className={field}
            />
            <UniversityField
              initial={{
                id: profile.universityId,
                name: profile.universityName,
                shortName: profile.universityShort,
              }}
              // A university's usual threshold is a sensible starting point,
              // but never overrides a number the student already chose.
              onPick={(hit) => {
                if (!thresholdTouched) setThreshold(String(hit.threshold));
              }}
            />

            <label className="text-label text-muted">
              Attendance threshold
              <div className="mt-1 flex items-center gap-3">
                <input
                  name="threshold"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={threshold}
                  onChange={(e) => {
                    setThreshold(e.target.value);
                    setThresholdTouched(true);
                  }}
                  className={field}
                />
                <span className="text-body font-semibold text-ink">%</span>
              </div>
              {/* The whole point of the university profile: no rule is hardcoded. */}
              <span className="mt-1 block text-caption">
                Yours alone — classmates at the same university keep their own. It
                governs every &ldquo;you can miss N more&rdquo; figure in the app.
              </span>
            </label>

            <label className="text-label text-muted">
              Typical commute, one way
              <input
                name="travelMinutes"
                type="number"
                min={0}
                max={300}
                defaultValue={profile.travelMinutes ?? undefined}
                placeholder="minutes"
                className={cn(field, "mt-1")}
              />
            </label>

            <label className="flex items-start gap-3 rounded-tile bg-canvas p-4">
              <input
                name="attendanceMonitored"
                type="checkbox"
                defaultChecked={profile.attendanceMonitored}
                className="mt-0.5 size-5 shrink-0 accent-[var(--color-ink)]"
              />
              <span className="text-label text-ink">
                My attendance is formally monitored
                <span className="mt-1 block text-caption text-muted">
                  Visa sponsorship, a professional body, or an academic warning. The
                  Skip Advisor will always tell you to go, and say why.
                </span>
              </span>
            </label>

            <PillButton type="submit" size="md" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save"}
            </PillButton>

            <Status state={profileState} />
          </form>
        </Card>
      </Rise>

      <section>
        <h2 className="text-caption font-semibold uppercase text-muted">Goals</h2>

        <Stagger className="mt-4 flex flex-col gap-3" delay={0.06}>
          <AnimatePresence initial={false}>
            {goals.map((goal) => (
              <Rise key={goal.id} layout>
                <GoalCard goal={goal} />
              </Rise>
            ))}
          </AnimatePresence>

          <Rise>
            <Card>
              <form action={goalAction} className="flex flex-col gap-3">
                <input name="title" required placeholder="What are you working towards?" className={field} />
                <div className="flex gap-3">
                  <select name="kind" defaultValue="project" className={cn(field, "appearance-none")}>
                    <option value="project">A project</option>
                    <option value="habit">A habit</option>
                  </select>
                  <input
                    name="targetPerWeek"
                    type="number"
                    min={0}
                    max={50}
                    placeholder="Per week"
                    className={field}
                  />
                </div>
                <PillButton type="submit" variant="soft" size="md" disabled={addingGoal}>
                  {addingGoal ? "Adding…" : "Add a goal"}
                </PillButton>
                <Status state={goalState} />
              </form>
            </Card>
          </Rise>
        </Stagger>
      </section>

      {feedUrl && (
        <Rise>
          <CalendarFeedCard url={feedUrl} />
        </Rise>
      )}

      <Rise>
        <FloraToggle />
      </Rise>

      <Rise>
        <form action="/auth/sign-out" method="post">
          <PillButton type="submit" variant="ghost" size="md" className="w-full">
            Sign out
          </PillButton>
        </form>
        <p className="mt-4 text-center text-caption text-muted tnum">
          UniBoard v{process.env.NEXT_PUBLIC_APP_VERSION}
          {process.env.NEXT_PUBLIC_COMMIT ? ` · ${process.env.NEXT_PUBLIC_COMMIT}` : " · dev"}
        </p>
      </Rise>
    </Stagger>
  );
}

function CalendarFeedCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async () => regenerateCalendarToken(),
    null,
  );

  const local = url.startsWith("http://localhost");

  return (
    <Card>
      <p className="text-caption font-semibold uppercase text-muted">
        Google Calendar
      </p>
      <h2 className="mt-2 text-h2 font-bold">Subscribe to your timetable</h2>
      <p className="mt-2 text-body text-muted">
        Classes, study blocks, hand-ins and exams, in whatever calendar you
        already use. Google refreshes subscribed calendars every few hours, so
        changes here show up there on its schedule, not instantly.
      </p>

      <p className="mt-4 break-all rounded-tile bg-canvas p-4 text-label text-ink">
        {url}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <PillButton
          type="button"
          variant="soft"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              // Clipboard is blocked in some browsers; the URL is on screen
              // to select by hand.
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </PillButton>

        <form action={action}>
          <PillButton type="submit" variant="ghost" size="sm" disabled={pending}>
            {pending ? "Rolling…" : "Reset link"}
          </PillButton>
        </form>
      </div>

      <p className="mt-3 text-caption text-muted">
        In Google Calendar: <span className="text-ink">Other calendars → + → From URL</span>.
        {local
          ? " This link points at localhost, so it only works on this machine — deploy to use it from Google."
          : " Anyone with this link can read your timetable, so treat it like a password. Reset it to revoke old subscriptions."}
      </p>

      <Status state={state} />
    </Card>
  );
}

function FloraToggle() {
  const enabled = useFloraEnabled();

  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-body font-semibold">Flora</p>
        <p className="mt-0.5 text-label text-muted">
          {enabled
            ? "She chips in with whatever is most pressing."
            : "Hidden. Nothing else changes."}
        </p>
      </div>
      <PillButton
        type="button"
        variant={enabled ? "outline" : "primary"}
        size="sm"
        onClick={() => setFloraEnabled(!enabled)}
      >
        {enabled ? "Hide" : "Bring her back"}
      </PillButton>
    </Card>
  );
}

function UpgradeCard() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    upgradeAccount,
    null,
  );

  return (
    <Card className="border-l-4 border-sun">
      <p className="text-caption font-semibold uppercase text-muted">
        You are browsing as a guest
      </p>
      <h2 className="mt-2 text-h2 font-bold">Keep this account</h2>
      <p className="mt-2 text-body text-muted">
        Add an email and password and everything you have entered stays exactly
        where it is — same account, just reachable from another device.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@uni.ac.uk"
          className={field}
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Password (8+ characters)"
          className={field}
        />
        <PillButton type="submit" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save my account"}
        </PillButton>
        <Status state={state} />
      </form>
    </Card>
  );
}

function GoalCard({ goal }: { goal: GoalVM }) {
  const [pending, startTransition] = useTransition();

  const nudge = (delta: number) =>
    startTransition(async () => {
      await setGoalProgress(goal.id, goal.progress + delta);
    });

  return (
    <Card className={cn("flex items-center gap-4 p-4", pending && "opacity-60")}>
      <SketchRing value={goal.progress} seedKey={goal.id} size={64} thickness={8} tone="var(--color-iris)">
        <span className="text-caption font-bold tnum">
          <AnimatedNumber value={goal.progress} suffix="%" />
        </span>
      </SketchRing>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-body font-semibold">{goal.title}</h3>
        <p className="mt-0.5 text-caption uppercase text-muted">
          {goal.kind === "habit" ? "Habit" : "Project"}
          {goal.targetPerWeek ? ` · ${goal.targetPerWeek}× a week` : ""}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <Nudge onClick={() => nudge(-10)} label={`Reduce ${goal.title} progress`}>
            −
          </Nudge>
          <Nudge onClick={() => nudge(10)} label={`Increase ${goal.title} progress`}>
            +
          </Nudge>
          <button
            type="button"
            onClick={() => startTransition(async () => { await archiveGoal(goal.id); })}
            className="ml-auto text-label text-muted underline underline-offset-4 hover:text-ink"
          >
            Archive
          </button>
        </div>
      </div>
    </Card>
  );
}

function Nudge({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={press}
      transition={SOFT_SPRING}
      className="grid size-8 place-items-center rounded-full bg-canvas text-body font-bold text-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {children}
    </motion.button>
  );
}

function Status({ state }: { state: ActionState }) {
  return (
    <AnimatePresence>
      {state && (
        <motion.p
          key={state.message}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: EASE_SOFT }}
          role="status"
          className={cn("text-label", state.ok ? "text-leaf" : "text-coral")}
        >
          {state.message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
