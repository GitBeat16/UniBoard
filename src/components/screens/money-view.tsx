"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SketchBar } from "@/components/charts/sketch-bar";
import { SketchRing } from "@/components/charts/sketch-ring";
import { FloraSays } from "@/components/flora/flora-says";
import { LOG_SPEND_EVENT } from "@/components/money/places-list";
import { Card } from "@/components/ui/card";
import { IconClose, IconLocation } from "@/components/ui/icons";
import { Illustration } from "@/components/ui/illustration";
import { LocalTime } from "@/components/ui/local-time";
import { Rise, Stagger } from "@/components/ui/motion-primitives";
import { PillButton } from "@/components/ui/pill-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";
import { EASE_SOFT, LAYOUT_SPRING } from "@/lib/motion";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CURRENCIES,
  currencySymbol,
  currentBudget,
  dayKey,
  formatMoney,
  summarize,
  type Budget,
  type BudgetStatus,
  type Category,
  type Expense,
} from "@/lib/money/budget";
import type { Tone } from "@/lib/tones";
import { toneBg } from "@/lib/tones";
import { useNow } from "@/lib/use-now";
import {
  addExpense,
  clearCampus,
  removeExpense,
  setBudget,
  setCampus,
  type ActionState,
} from "@/app/(app)/money/actions";

export type BudgetRow = Budget;
export type ExpenseRow = Expense;
export type CampusVM = { lat: number; lng: number; label: string | null };

const field =
  "h-12 w-full rounded-full bg-canvas px-5 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

const CATEGORY_TONE: Record<Category, Tone> = {
  food: "sun",
  transport: "sky",
  study: "iris",
  fun: "coral",
  other: "leaf",
};

const STATUS: Record<BudgetStatus, { word: string; tone: Tone; chip: string }> = {
  fine: { word: "On track", tone: "leaf", chip: "bg-leaf-soft" },
  tight: { word: "Running quick", tone: "sun", chip: "bg-sun-soft" },
  over: { word: "Over budget", tone: "coral", chip: "bg-coral-soft" },
};

/**
 * Presentational Money screen. The page fetches rows; the maths runs here, in
 * the browser, because "today" and "this week" are the student's local ones.
 * Until mounted there is no clock, so the numbers wait rather than guess.
 */
export function MoneyView({
  currency,
  budgets,
  expenses,
  campus,
  places,
}: {
  currency: string;
  budgets: BudgetRow[];
  expenses: ExpenseRow[];
  campus: CampusVM | null;
  /** Server-rendered, streamed slot. */
  places: React.ReactNode;
}) {
  const now = useNow();
  const mounted = now > 0;
  const nowDate = useMemo(() => new Date(now), [now]);

  const budget = mounted ? currentBudget(budgets, nowDate) : null;
  const summary = useMemo(
    () => (budget ? summarize(budget, expenses, nowDate) : null),
    [budget, expenses, nowDate],
  );

  const [editingBudget, setEditingBudget] = useState(false);
  const money = (n: number, round = false) => formatMoney(n, currency, { round });

  const inPeriod = summary
    ? expenses.filter((e) => {
        const t = new Date(e.spentAt);
        return t >= summary.start && t < summary.end;
      })
    : [];

  return (
    <Stagger className="flex flex-col gap-8">
      <Rise>
        <SectionHeading light="Food and" bold="budget" />
      </Rise>

      {mounted && (
        <Rise>
          <FloraSays
            context={{
              screen: "money",
              budget: summary ? summary.status : "none",
              budgetKind: budget?.kind,
              hasCampus: campus !== null,
            }}
          />
        </Rise>
      )}

      {/* ---------------------------------------------------------- budget */}
      <Rise>
        {!mounted ? (
          <Card className="h-56 animate-pulse motion-reduce:animate-none" aria-busy="true" />
        ) : summary && budget && !editingBudget ? (
          <BudgetCard
            summary={summary}
            budget={budget}
            money={money}
            onEdit={() => setEditingBudget(true)}
          />
        ) : (
          <Card>
            {!budget && <Illustration name="money" tone="sun" className="mx-auto -mt-2 w-44" />}
            <p className="text-caption font-semibold uppercase text-muted">
              {budget ? "Change your budget" : "Set a budget"}
            </p>
            <h2 className="mt-2 text-h2 font-bold">
              {budget ? "New numbers from today" : "How much for a week?"}
            </h2>
            {!budget && (
              <p className="mt-2 text-body text-muted">
                One number is enough. UniBoard splits it into a fair share per day and
                tells you what today can take.
              </p>
            )}
            <BudgetForm
              currency={currency}
              current={budget}
              today={dayKey(nowDate)}
              onDone={() => setEditingBudget(false)}
              onCancel={budget ? () => setEditingBudget(false) : undefined}
            />
          </Card>
        )}
      </Rise>

      {/* ------------------------------------------------------- quick add */}
      <Rise>
        <QuickAdd currency={currency} />
      </Rise>

      {/* ---------------------------------------------------- recent spends */}
      {summary && (
        <Rise>
          <SpendList
            expenses={inPeriod}
            money={money}
            period={budget?.kind === "month" ? "month" : "week"}
          />
        </Rise>
      )}

      {/* ------------------------------------------------------ food nearby */}
      <Rise>
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-caption font-semibold uppercase text-muted">Food nearby</h2>
              {campus && (
                <p className="mt-1 truncate text-label text-ink/80">
                  Walking from {campus.label || "your campus pin"}
                </p>
              )}
            </div>
          </div>
          {campus ? (
            <>
              <CampusControls campus={campus} />
              {places}
            </>
          ) : (
            <CampusPinCard />
          )}
        </section>
      </Rise>
    </Stagger>
  );
}

// --------------------------------------------------------------- budget card

function BudgetCard({
  summary,
  budget,
  money,
  onEdit,
}: {
  summary: NonNullable<ReturnType<typeof summarize>>;
  budget: Budget;
  money: (n: number, round?: boolean) => string;
  onEdit: () => void;
}) {
  const s = STATUS[summary.status];
  const period = budget.kind === "month" ? "month" : "week";
  const overToday = summary.leftToday < 0;

  return (
    <Card>
      <div className="flex items-center gap-5">
        <SketchRing
          value={summary.usedPct}
          seedKey="budget"
          size={136}
          thickness={15}
          tone={`var(--color-${s.tone})`}
        >
          <div className="px-2 text-center">
            <p className="text-caption font-semibold uppercase text-muted">
              {overToday ? "Over today" : "Left today"}
            </p>
            <p className={cn("text-h2 font-bold tnum", overToday && "text-coral")}>
              {overToday ? money(-summary.leftToday, true) : money(summary.leftToday, true)}
            </p>
          </div>
        </SketchRing>

        <div className="min-w-0 flex-1">
          {/* Status is a word, never only a colour. */}
          <span
            className={cn(
              "inline-block rounded-chip px-2.5 py-1 text-caption font-semibold uppercase text-ink/80",
              s.chip,
            )}
          >
            {s.word}
          </span>
          <p className="mt-2 text-body tnum">
            <span className="font-bold">{money(summary.spent)}</span>
            <span className="text-muted"> of {money(budget.total)}</span>
          </p>
          <p className="text-label text-muted">spent this {period}</p>
          <p className="mt-2 text-label tnum">
            {summary.remaining > 0 ? (
              <>
                <span className="font-semibold">{money(summary.perDay, true)}</span>
                <span className="text-muted">
                  {" "}
                  a day for {summary.daysLeft} {summary.daysLeft === 1 ? "day" : "days"}
                </span>
              </>
            ) : (
              <span className="font-semibold text-coral">
                {money(-summary.remaining)} over for the {period}
              </span>
            )}
          </p>
        </div>
      </div>

      {overToday && summary.remaining > 0 && (
        <p className="mt-4 rounded-tile bg-sun-soft px-4 py-3 text-label text-ink/80">
          Today is past its even share. Nothing breaks — the rest of the {period} just gets a
          little less each day.
        </p>
      )}

      {budget.food !== null && summary.foodRemaining !== null && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between text-label">
            <span className="font-semibold">Food</span>
            <span className="tnum text-muted">
              {summary.foodRemaining >= 0
                ? `${money(summary.foodRemaining)} left of ${money(budget.food)}`
                : `${money(-summary.foodRemaining)} over ${money(budget.food)}`}
            </span>
          </div>
          <SketchBar
            className="mt-2"
            value={budget.food > 0 ? (summary.spentFood / budget.food) * 100 : 100}
            seedKey="budget-food"
            tone={`var(--color-${summary.foodRemaining >= 0 ? "sun" : "coral"})`}
          />
        </div>
      )}

      <CategoryBreakdown byCategory={summary.byCategory} spent={summary.spent} money={money} />

      <PillButton variant="ghost" size="sm" className="-ml-3 mt-4" onClick={onEdit}>
        Change budget
      </PillButton>
    </Card>
  );
}

function CategoryBreakdown({
  byCategory,
  spent,
  money,
}: {
  byCategory: Record<Category, number>;
  spent: number;
  money: (n: number) => string;
}) {
  const used = CATEGORIES.filter((c) => byCategory[c] > 0);
  if (used.length < 2 || spent <= 0) return null;

  return (
    <div className="mt-5">
      {/* One stacked strip, then a labelled legend — colour plus words. */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
        {used.map((c) => (
          <motion.span
            key={c}
            className={toneBg[CATEGORY_TONE[c]]}
            initial={{ width: 0 }}
            animate={{ width: `${(byCategory[c] / spent) * 100}%` }}
            transition={{ duration: 0.7, ease: EASE_SOFT }}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {used.map((c) => (
          <li key={c} className="flex items-center gap-2 text-label">
            <span className={cn("size-2.5 shrink-0 rounded-full", toneBg[CATEGORY_TONE[c]])} />
            <span className="flex-1 truncate">{CATEGORY_LABEL[c]}</span>
            <span className="tnum text-muted">{money(byCategory[c])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------- budget form

function BudgetForm({
  currency,
  current,
  today,
  onDone,
  onCancel,
}: {
  currency: string;
  current: Budget | null;
  today: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setBudget, null);
  const [kind, setKind] = useState<"week" | "month">(current?.kind ?? "week");
  const kindId = useId();

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="mt-5 flex flex-col gap-3">
      <input type="hidden" name="today" value={today} />
      <input type="hidden" name="kind" value={kind} />

      <div className="flex gap-1 rounded-full bg-canvas p-1" role="radiogroup" aria-label="Budget period">
        {(["week", "month"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "relative flex-1 rounded-full px-3 py-2 text-label font-semibold",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              kind === k ? "text-paper" : "text-muted hover:text-ink",
            )}
          >
            {kind === k && (
              <motion.span
                layoutId={`${kindId}-kind`}
                transition={LAYOUT_SPRING}
                className="absolute inset-0 rounded-full bg-ink"
              />
            )}
            <span className="relative">{k === "week" ? "Per week" : "Per month"}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <label className="sr-only" htmlFor={`${kindId}-cur`}>
          Currency
        </label>
        <select
          id={`${kindId}-cur`}
          name="currency"
          defaultValue={currency}
          className={cn(field, "w-28 shrink-0 appearance-none")}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          name="total"
          inputMode="decimal"
          required
          placeholder={kind === "week" ? "e.g. 1500" : "e.g. 6000"}
          defaultValue={current?.total ?? ""}
          aria-label="Total budget"
          className={field}
        />
      </div>

      <input
        name="food"
        inputMode="decimal"
        placeholder="Of which food (optional)"
        defaultValue={current?.food ?? ""}
        aria-label="Food budget, optional"
        className={field}
      />

      <div className="flex gap-2">
        <PillButton type="submit" size="md" className="flex-1" disabled={pending || !today}>
          {pending ? "Saving…" : current ? "Save from today" : "Set budget"}
        </PillButton>
        {onCancel && (
          <PillButton type="button" variant="ghost" size="md" onClick={onCancel}>
            Cancel
          </PillButton>
        )}
      </div>
      <Status state={state} />
    </form>
  );
}

// --------------------------------------------------------------- quick add

function QuickAdd({ currency }: { currency: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addExpense, null);
  const [category, setCategory] = useState<Category>("food");
  const [note, setNote] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const catId = useId();

  // A clean slate after each successful log, ready for the next one.
  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset mirrors the form reset
    setNote("");
  }, [state]);

  // "Log a spend here" on a nearby place fills the note and focuses amount.
  useEffect(() => {
    function onLog(e: Event) {
      const detail = (e as CustomEvent<{ note: string }>).detail;
      setNote(detail.note);
      setCategory("food");
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => amountRef.current?.focus({ preventScroll: true }), 350);
    }
    window.addEventListener(LOG_SPEND_EVENT, onLog);
    return () => window.removeEventListener(LOG_SPEND_EVENT, onLog);
  }, []);

  return (
    <Card>
      <p className="text-caption font-semibold uppercase text-muted">Log a spend</p>
      <form ref={formRef} action={action} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="category" value={category} />
        <div className="relative">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-h2 font-bold text-muted">
            {currencySymbol(currency)}
          </span>
          <input
            ref={amountRef}
            name="amount"
            inputMode="decimal"
            required
            placeholder="0"
            aria-label={`Amount in ${currency}`}
            className={cn(field, "pl-11 text-h2 font-bold tnum")}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "relative rounded-full px-4 py-2 text-label font-semibold",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                category === c ? "text-paper" : "bg-canvas text-ink hover:bg-ink/10",
              )}
            >
              {category === c && (
                <motion.span
                  layoutId={`${catId}-cat`}
                  transition={LAYOUT_SPRING}
                  className="absolute inset-0 rounded-full bg-ink"
                />
              )}
              <span className="relative flex items-center gap-2">
                <span
                  className={cn("size-2 rounded-full", toneBg[CATEGORY_TONE[c]])}
                  aria-hidden="true"
                />
                {CATEGORY_LABEL[c]}
              </span>
            </button>
          ))}
        </div>

        <input
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          placeholder="What was it? (optional)"
          className={field}
        />

        <PillButton type="submit" size="md" disabled={pending}>
          {pending ? "Logging…" : "Log it"}
        </PillButton>
        <Status state={state} />
      </form>
    </Card>
  );
}

// ------------------------------------------------------------- spend list

const FIRST_SPENDS = 6;

function SpendList({
  expenses,
  money,
  period,
}: {
  expenses: Expense[];
  money: (n: number) => string;
  period: "week" | "month";
}) {
  const [showAll, setShowAll] = useState(false);
  const [removing, startRemove] = useTransition();
  const shown = showAll ? expenses : expenses.slice(0, FIRST_SPENDS);

  return (
    <section>
      <h2 className="text-caption font-semibold uppercase text-muted">This {period}</h2>
      {expenses.length === 0 ? (
        <p className="mt-3 text-label text-ink/80">Nothing logged this {period} yet.</p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-tile bg-paper shadow-soft">
          <AnimatePresence initial={false}>
            {shown.map((e) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: EASE_SOFT }}
                className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0"
              >
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", toneBg[CATEGORY_TONE[e.category]])}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label font-semibold">
                    {e.note || CATEGORY_LABEL[e.category]}
                  </p>
                  <p className="text-caption text-muted">
                    {e.note ? `${CATEGORY_LABEL[e.category]} · ` : ""}
                    <LocalTime iso={e.spentAt} mode="when" />
                  </p>
                </div>
                <span className="text-label font-bold tnum">{money(e.amount)}</span>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => startRemove(() => removeExpense(e.id))}
                  aria-label={`Remove ${money(e.amount)} ${e.note ?? CATEGORY_LABEL[e.category]}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <IconClose className="size-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {expenses.length > FIRST_SPENDS && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-2 rounded-full px-3 py-1.5 text-label font-semibold underline underline-offset-4 hover:bg-ink/5"
        >
          {showAll ? "Show fewer" : `Show all ${expenses.length}`}
        </button>
      )}
    </section>
  );
}

// -------------------------------------------------------------- campus pin

function CampusPinCard({ onDone }: { onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setCampus, null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [coords, setCoords] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setGeoError("This browser cannot share a location. Paste coordinates instead.");
      return;
    }
    setGeoError(null);
    setLocating(true);
    // One fix, on a tap. Nothing is watched or stored beyond the pin itself.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCoords(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        // Let React commit the value, then submit.
        window.setTimeout(() => formRef.current?.requestSubmit(), 0);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Paste coordinates instead."
            : "Could not get a fix. Paste coordinates instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <Card>
      <Illustration name="places" tone="leaf" className="mx-auto -mt-2 w-40" />
      <h3 className="text-h2 font-bold">Pin your campus</h3>
      <p className="mt-2 text-body text-muted">
        Food is ranked by walking time from here. Set it once, standing on campus — it is
        never tracked after that.
      </p>
      <form ref={formRef} action={action} className="mt-5 flex flex-col gap-3">
        <PillButton type="button" size="md" onClick={locateMe} disabled={locating || pending}>
          <IconLocation className="mr-2 size-5" />
          {locating ? "Finding you…" : pending ? "Saving…" : "Use where I am now"}
        </PillButton>
        <p className="text-center text-caption uppercase text-muted">or</p>
        <input
          name="coords"
          value={coords}
          onChange={(e) => setCoords(e.target.value)}
          placeholder="Paste from Google Maps: 18.4575, 73.8508"
          aria-label="Coordinates"
          className={field}
        />
        <input
          name="label"
          maxLength={80}
          placeholder="Call it… (e.g. PICT main gate)"
          aria-label="Label for this pin"
          className={field}
        />
        <PillButton type="submit" variant="soft" size="md" disabled={pending || !coords.trim()}>
          Save pin
        </PillButton>
        {geoError && <p className="text-label text-coral">{geoError}</p>}
        <Status state={state} />
      </form>
    </Card>
  );
}

function CampusControls({ campus }: { campus: CampusVM }) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="flex gap-2">
        <PillButton variant="soft" size="sm" onClick={() => setEditing((e) => !e)}>
          {editing ? "Keep this pin" : "Move pin"}
        </PillButton>
        <form action={clearCampus}>
          <PillButton type="submit" variant="ghost" size="sm">
            Remove pin
          </PillButton>
        </form>
      </div>
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE_SOFT }}
            className="mt-3 overflow-hidden"
          >
            <CampusPinCard key={`${campus.lat},${campus.lng}`} onDone={() => setEditing(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
          className={cn("text-label", state.ok ? "text-ink/80" : "text-coral")}
        >
          {state.message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
