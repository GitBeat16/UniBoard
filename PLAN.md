# UniBoard — Product & Design Plan

> One board for the whole student day: timetable in, attendance tracked, an honest
> "go or skip?" call, and a plan for whichever you choose.

Status: **planning**. Nothing built yet. This document is the source of truth until code exists.

---

## 1. The problem, stated properly

A student's day is scattered across five apps that don't talk to each other: the uni
portal (timetable), a notes app (deadlines), a spreadsheet (attendance %), a banking app
(budget), and Instagram (society events). The decisions that actually matter —
*should I go in today? if I don't, what do I do with the four free hours? can I afford
lunch on campus?* — fall in the gaps between them.

UniBoard is one surface that holds the timetable and then reasons over it.

**Design constraint from day one: this is not for one university.** No hardcoded module
codes, no hardcoded 75% rule, no hardcoded campus map. Every university-specific fact
lives in a `UniversityProfile` the user picks or creates during setup.

---

## 2. Feature modules

### M1 — Timetable ingest
The gateway feature. If this is painful, nothing else gets used.

| Tier | Input | Effort | When |
|---|---|---|---|
| A | **ICS / calendar URL** (most unis publish one) | low | v1 |
| B | **Manual entry** — add a class, set recurrence | low | v1 |
| C | CSV / XLSX export from portal | medium | v1.1 |
| D | **Photo or PDF of a timetable** → OCR + LLM structuring | high | v2 |

Parsed into `Module` (a course) + recurring `ClassSession` (a concrete occurrence:
Mon 09:00, Lab 2.14, lecturer, type=lecture/lab/seminar/tutorial).

Tier D shipped ahead of schedule. A weekly grid has no dates on it, so the model returns
the repeating pattern (weekday + times) and the app expands it across a term length the
student supplies. The uid is derived from the pattern, so re-uploading the same photo
updates those rows instead of duplicating the term.

**Outbound sync.** Everything — classes, study blocks, hand-ins, exams — publishes to a
subscribable `.ics` feed that Google Calendar, Apple Calendar and Outlook can all read.
One-way and poll-based (Google refreshes every few hours), which is the honest tradeoff:
it needs no Google Cloud project, no OAuth consent screen and no stored refresh tokens.
Two-way sync would need all three.

### M2 — Attendance
- Mark present / absent / late per session. Sources, in order of preference:
  1. **Manual swipe** on the session card (always available, always the fallback)
  2. **Geofence auto-suggest** — user is within the campus building at class time, app
     asks "looks like you made it to Databases — mark present?" (suggest, never silently record)
- Per-module rolling `%`, and the number that students actually care about:
  **"you can miss 3 more before you drop below 75%."**
- **Explicit non-goal:** UniBoard never marks attendance on the university's own system
  and has no "mark me present remotely" feature. It mirrors reality for the student's own
  planning; it is not a proxy-attendance tool.

### M3 — The Skip Advisor  ⭐ the differentiator
Not a coin flip and not a nag. A small, **fully explainable** scoring model. The user sees
every input that moved the needle.

```
verdict_score =
    w_attend   * attendance_buffer_risk      // how close to the threshold
  + w_session  * session_importance          // assessed lab? new topic? guest lecture?
  + w_deadline * deadline_pressure           // what is due in <72h
  + w_travel   * travel_cost                 // 50-min commute for one 50-min class
  + w_state    * self_reported_state         // ill / exhausted / fine
```

Four possible verdicts, each with **2–3 plain-English reasons**:

- **GO — this one matters.** (assessed, or buffer already spent)
- **GO if you can.** (no hard reason to skip, buffer is healthy but not deep)
- **YOUR CALL.** (genuinely balanced — here are both sides)
- **SKIPPING IS FINE TODAY.** (deep buffer, recorded lecture, and something more urgent is due)

**Hard guardrails that override the score:**
- Never returns "skip fine" if it would push the module below its threshold.
- Never returns "skip fine" for a session flagged assessed / mandatory / has-a-submission.
- Attendance-threshold and visa/sponsorship-attendance flags (international students —
  a real consequence) force GO and say why.

### M4 — Reclaim (the "if you skip, spend it well" half)
The feature that makes skipping defensible instead of lazy. The freed block becomes a
concrete plan built from what the app already knows:

- nearest assignment deadline → a sized work block
- upcoming exam → a revision block on the weakest topic
- an active `Goal` ("finish the React course", "gym 3x") → a slot
- always ends with: a real break, not a 4-hour fantasy block

Output is a small timeline card for the freed hours, droppable into the calendar.

### M5 — Reminders
- T-60 / T-15 before a class, tuned per user.
- **Escalated reminder** when the session has a submission or lab prep attached:
  fires the night before *and* in the morning, with the deliverable named.
- Morning digest: today's classes, today's verdicts, what's due.

### M6 — Food & Budget
- Nearby places ranked by **walking time from the next class's building**, price band,
  and rating — not just "restaurants near me".
- Filter to what's left in today's food budget.
- Spend logging: quick-add amount + category. Weekly/monthly budget ring, burn rate,
  "£4.20/day left for the rest of the week".
- Sources to evaluate: OpenStreetMap Overpass (free, no key) → Foursquare → Google Places.
  Start with OSM to avoid a billing key during development.

### M7 — UniBoard (the pinboard)
The namesake screen. Events pinned as cards: society socials, careers fairs, guest
lectures, deadlines, exam dates. Sources: manual pin, ICS feeds from society calendars,
and shared pins between users later. Filters by tag; "save" adds it to the timeline and
makes it visible to the Reclaim planner.

### Cross-cutting
`Goals`, `Assignments`, `Exams`, `UniversityProfile`, `Profile/Settings`.

---

## 3. Screen inventory

| # | Screen | Purpose |
|---|---|---|
| 01 | Splash / value prop | "UniBoard — your whole uni day, on one board." |
| 02 | Setup: university + attendance rule | picks the `UniversityProfile` |
| 03 | Setup: timetable import | ICS URL / manual / photo |
| 04 | Setup: goals, budget, exam dates | seeds the planner |
| 05 | **Home** | "Hello, {name}" · next class · today's verdict · module grid |
| 06 | Week / timetable view | the grid, colour-coded by module |
| 07 | Class detail | history, submissions, materials, **Go or Skip** button |
| 08 | **Skip Advisor result** | verdict, the reasons, the reclaim offer |
| 09 | Reclaim plan | the freed-block timeline |
| 10 | Attendance dashboard | per-module hand-drawn donuts, "miss N more" |
| 11 | Assignments & exams | list + calendar, urgency sort |
| 12 | Goals | progress, weekly targets |
| 13 | Food & budget | nearby list/map + budget ring + quick spend add |
| 14 | UniBoard feed | pinned event cards |
| 15 | Profile & settings | notifications, thresholds, data export |

Bottom nav, 5 tabs: **Home · Timetable · Board · Money · Me**
(Attendance lives inside Timetable; the Advisor is reached from a class, not a tab.)

**Revised in P3:** the Board is not only society events. It is everything pinned with a
date on it — hand-ins, exams, and from P6 the campus events too. That is closer to what
a physical board on a wall actually holds, and it gives deadlines a home without a sixth
tab. Goals and the university profile live on Me.

---

## 4. Design system

The reference (School-Q) is a specific, recognisable style. Naming it so we can hold the
line across 15 screens:

> **Paper & Doodle.** White cards floating on soft colour blocks, heavy black geometric
> type, hand-drawn line illustrations with visible wobble and hatching, and one loud
> black pill button per screen.

### Colour tokens

```ts
// theme/tokens.ts
export const color = {
  ink:      '#111111',  // type, strokes, primary buttons
  paper:    '#FFFFFF',  // cards
  canvas:   '#EFF1F0',  // app background
  muted:    '#A8AEB4',  // secondary text

  coral:    '#F2846B',  // primary accent — blobs, "at risk"
  sky:      '#7BB1EB',  // secondary accent — blobs, "scheduled"
  sun:      '#F5CE72',  // tertiary — blobs, "warning"
  leaf:     '#7BC47F',  // success, "safe to skip"
  iris:     '#7B6FD4',  // info, goals

  // 12% tints of each, used as the soft halo behind module icons
  coralSoft:'#FDEDE8', skySoft:'#EAF3FC', sunSoft:'#FDF6E6',
  leafSoft: '#ECF7ED', irisSoft:'#EEECFA',
} as const;
```

Semantic mapping so colour carries meaning, not just decoration:
`leaf` = attendance safe · `sun` = buffer getting thin · `coral` = below threshold / overdue.

### Type
- One display family throughout, as in the reference: **Poppins** (or Outfit).
  Weights 400 / 600 / 700 only.
- The signature move: **two-line headings with mixed weight** —
  `Hello,` 400 / `Srushti` 700 · `Mathematics` 400 / `Lesson` 700.
- Scale: `display 34/38` · `h1 28/32` · `h2 22/26` · `body 16/24` · `label 13/16` ·
  `caption 11/14 (+0.4 tracking, uppercase)`
- Numbers in the money and attendance screens use **tabular figures** so they don't jitter.

### Shape & depth
```
radius:  card 32 · tile 24 · chip 16 · pill 999
space:   4 · 8 · 12 · 16 · 24 · 32 · 48
shadow:  0 12px 32px rgba(17,17,17,0.06)   // one elevation only — soft, never harsh
```
Cards overlap the coloured background blobs and each other slightly. That overlap is the
whole look; a flat grid of cards will read as a generic dashboard.

### Flora

The guide. A sprout drawn in the same stroke language as everything else —
2px ink, rounded caps, a leaf body, two leaf arms that sway out of phase.

She has six moods (`happy`, `cheer`, `neutral`, `thinking`, `worried`,
`sleepy`) and one rule that keeps her from becoming wallpaper: **her mood and
her line are derived from real state**, never chosen at random. A worried Flora
means a module is actually under threshold. On the Advisor screen she mirrors
the verdict and is never allowed to contradict the engine.

`src/lib/flora/lines.ts` is a pure priority list — a module below threshold
outranks overdue work, which outranks an imminent class, which outranks work
due today. She says the single most useful thing available, or nothing at all.
Tone rules are enforced by test: she never says *should*, *must*, *behind* or
*deserve*, and every line fits a speech bubble.

She is dismissible from her own bubble and restorable from Me. A guide you
cannot switch off is an irritation.

### Illustration & charts
This is the part that makes or breaks the resemblance.

- **Icons:** one hand-drawn stroke set, 2px, rounded caps, deliberate imperfection.
  Custom SVG paths — do *not* mix in a geometric set like Feather; the inconsistency shows
  immediately. Each icon sits on a soft-tint circle halo.
- **Charts:** use **rough.js** (or a pre-baked equivalent) for the sketchy donut/bar look
  in the reference. This is the single highest-leverage library choice for the aesthetic.
  Hatch fills for the highlighted segment.
- **Blobs:** 3–4 organic SVG background shapes, reused across screens at different
  rotations and crops.
- **Motion:** slow and soft. 250–350ms, gentle spring. Cards rise on press, verdict
  reveals with a short stagger. Nothing bouncy.

### Accessibility, since the palette is pastel
Pastels on white fail contrast. Rule: **colour is never the only signal.** Every coloured
state also carries an icon and a word. Body text is always `ink` on `paper` — the accents
are for fills, halos and strokes, never for text under 18px.

---

## 5. Data model (first sketch)

```
UniversityProfile  id, name, country, attendanceThreshold, termDates[], buildings[], icsHint
Module             id, code, name, colorToken, credits, attendanceRequired, threshold?
ClassSession       id, moduleId, type, startsAt, endsAt, room, buildingId, recurrenceRule,
                   isAssessed, hasSubmission, isRecorded
AttendanceRecord   id, sessionId, status(present|absent|late|excused), source(manual|geo), at
Assignment         id, moduleId, title, dueAt, weight, status, estimatedHours
Exam               id, moduleId, startsAt, room, topics[]
Goal               id, title, kind(habit|project), targetPerWeek, progress
StudyBlock         id, startsAt, endsAt, source(reclaim|manual), linkedId, done
Expense            id, amount, category, venueId?, at
BudgetPeriod       id, kind(week|month), foodBudget, totalBudget, startsAt
Venue              id, name, lat, lng, priceBand, rating, walkMinsFrom(buildingId)
BoardEvent         id, title, startsAt, location, tags[], source, pinned
SkipDecision       id, sessionId, verdict, score, reasons[], choseToSkip, at   // for tuning
```

`SkipDecision` is logged deliberately: after a few weeks it lets the advisor learn this
student's actual pattern instead of relying on fixed weights forever.

---

## 6. Stack (decided)

| Layer | Choice |
|---|---|
| App | **Next.js (App Router) + TypeScript**, deployed on **Vercel** |
| Styling | **Tailwind v4**, design tokens declared in `@theme` so they're real CSS vars |
| Data | **Supabase** — Postgres + Auth + Row Level Security, from day one |
| Charts | **rough.js** → SVG (runs natively in the browser, no port needed) |
| Scheduled work | **Vercel Cron** → route handler → digest send |
| Location | one-shot `navigator.geolocation` on tap. No background tracking |
| Places | OpenStreetMap Overpass first (no API key, no billing), Foursquare if it's not good enough |

Every table gets RLS on `auth.uid()` from the first migration. Retrofitting RLS onto a
schema that was built without it is miserable, and this app holds a student's location,
spending and attendance record.

### The consequence of going web

Two features in this plan assumed a native app. Being straight about what changes:

- **M5 Reminders degrade.** No native push. The realistic path is a **PWA + Web Push**,
  which works on desktop and Android, and on iOS only once the user installs the app to
  their home screen (16.4+). Fallback: an **email digest** via Vercel Cron. So the
  morning digest and the night-before submission warning still work; the "T-15, you need
  to leave now" nudge is unreliable on iPhone unless they install the PWA.
- **M2 geofence auto-suggest is out.** Browsers have no background geofencing. Replaced
  with a **"Check in" button** on the current session that grabs one-shot geolocation and
  verifies you're near the building. Same honesty guarantee, one extra tap.

Neither blocks the MVP — M3, the actual differentiator, is unaffected. But the plan should
not pretend otherwise, and if reminders turn out to be the feature you care most about,
that's the moment to revisit Expo.

---

## 7. Build phases — thin functional MVP

Logic first, real data throughout, UI plain-but-tokenised and polished in P6. Each phase
ends with something that works.

- **P0 — Scaffold.** Next.js + Tailwind v4 with the tokens from §4, Supabase project,
  auth, full schema + RLS migration, base components (Card, PillButton, ModuleTile,
  SectionHeading). *Done when: you can sign in and see an empty, correctly-styled Home.*
- **P1 — Timetable + attendance. ✅** ICS import (link, file, by hand), week strip,
  session cards, mark present/absent, per-module %, "you can miss N more".
- **P2 — Skip Advisor. ✅** Pure engine in `src/lib/advisor/engine.ts` (zero UI imports),
  17 unit tests covering every guardrail, the verdict screen with a live gauge, an
  honest-state toggle that re-runs the call instantly, and decisions logged to
  `skip_decisions` for later tuning.
- **P3 — Assignments, exams, goals. ✅** The Board now holds hand-ins and exams, ranked by
  a pure urgency module (10 tests) and feeding the Skip Advisor's deadline pressure. Me
  holds goals plus the university profile — attendance threshold, monitored flag, commute.
- **Auth, revised.** Magic link alone was the wrong single door: the built-in SMTP allows
  a couple of emails an hour, which made the app unusable during development and would
  have been worse for a student trying it in a lecture hall. Three ways in now — password,
  magic link, and a guest account that is a real anonymous Supabase user (so RLS is
  untouched) and can be upgraded later without losing data.

- **P4 — Reclaim. ✅** A skipped class becomes a real plan: focus blocks sized from the
  estimated work, ordered by urgency, with breaks between and always ending on one. It
  refuses to invent a work block out of twenty minutes, and it is rebuilt server-side on
  save rather than trusting the client's slots.
- **P5 — Design pass.** Hand-drawn icon set, rough.js sketched charts, empty-state
  illustrations. Called out as its own phase so it doesn't get skipped — a "thin MVP"
  has a habit of shipping thin.

  **Motion was pulled forward out of this phase and is already built** (`src/lib/motion.ts`):
  one shared easing and spring, staggered entrances, sliding layout pills, drifting
  blobs, counting numbers, a drawing attendance ring. It respects `prefers-reduced-motion`
  through a single `MotionConfig`. New screens should pull from that file rather than
  inventing durations.
- **P6 — Food & budget, then the Board.**

**Deferred: reminders and nudges (was P5).** Parked by decision, revisited after the core
loop works. Two things to keep true in the meantime so picking it up later is cheap:

- `ClassSession.isAssessed` / `hasSubmission` and `Assignment.dueAt` are the only inputs a
  reminder engine needs. They land in P1/P3 regardless, so nothing extra is required now.
- Keep "what should fire, and when" as a **pure function over the schedule** rather than
  logic tangled into whatever delivery channel we pick. Then Web Push, email digest, or a
  native app later are all just different sinks for the same computed list.

This also means the web-vs-native tradeoff in §6 stays genuinely reversible — the feature
that suffered most from choosing web is the one we are not building yet.

## 8. Still open

- **Dark mode.** Paper & Doodle is built on white. Recommend light-only for v1 and say so
  out loud rather than shipping a half-dark theme.
- **Multi-user Board.** Shared event pins need a second RLS story (public-read rows).
  Out of MVP scope; the schema should not make it hard later.
