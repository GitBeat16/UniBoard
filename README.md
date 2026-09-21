# UniBoard

Your whole uni day, on one board. Timetable in → attendance tracked → an honest
go-or-skip call → a plan for whichever you choose.

See [PLAN.md](PLAN.md) for the product plan, design system and phase breakdown.

## Status

All of PLAN.md's modules are built: P0–P4, the P5 design pass, Money, and the soft board with shared campus events. Reminders stay parked, by decision.

**P0–P4 done:** scaffold, timetable + attendance, the Skip Advisor, the work board, and
Reclaim (a skipped class becomes a real plan). Motion and Flora were pulled forward from
P5. Timetables can also be read from a photo or PDF, and everything publishes to a
subscribable calendar feed.

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind v4, tokens in `src/app/globals.css` under `@theme` |
| Data | Supabase — project `uniboard`, `ap-south-1` |
| Auth | Password, magic link, or guest (Supabase anonymous user) |
| Motion | `motion` (Framer), system in `src/lib/motion.ts` |
| Calendars | `ical.js` in, hand-rolled RFC 5545 out (`src/lib/calendar/`) |
| Vision | `groq-sdk` — `qwen/qwen3.8-27b` for images, `openai/gpt-oss-120b` for PDF text |

## Two project toggles this app needs

Both live in Supabase → Authentication → Sign In / Providers. Without them the app
still runs and explains itself, but two of the three ways in are dead ends:

| Toggle | Why |
|---|---|
| Auth → **Leaked password protection: on** | Checks new passwords against HaveIBeenPwned. Worth doing now that the app has password sign-in. |
| Email → **Confirm email: off** | Otherwise `signUp` returns no session and every new account has to go through the emailed confirmation, which is rate-limited to a couple an hour on the built-in SMTP. |
| **Anonymous sign-ins: on** | Powers "Have a look around first". |

Check the current state without the dashboard:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
```

`mailer_autoconfirm` should be `true` and `external.anonymous_users` should be `true`.

## Deployment

Production: **https://uni-board-flax.vercel.app** (Vercel project `uni-board`, auto-deploys
on push to `main`).

- Functions run in **`bom1` (Mumbai)** via `vercel.json`, next to Supabase's `ap-south-1`.
  Vercel's default is Washington, which puts a round trip across the world in front of
  every query.
- `NEXT_PUBLIC_SITE_URL` is the production address. The calendar feed link is built from
  it, so a link copied on a preview deployment still works after that preview is gone.
- Supabase → Authentication → URL Configuration must list
  `https://uni-board-flax.vercel.app/**` (and `http://localhost:3000/**` for dev) under
  Redirect URLs, or magic links fall back to the Site URL.
- Uploads: Vercel caps a request at 4.5 MB, so timetable files are capped at 4 MB and
  photos are shrunk in the browser first (`src/lib/upload/shrink-image.ts`).

## Releases

Versions live in `package.json`, `CHANGELOG.md` and git tags, and the running
version shows at the bottom of **Me**. To cut one:

1. Move the `[Unreleased]` notes in `CHANGELOG.md` under the new version.
2. Bump `version` in `package.json`, and commit.
3. `git tag -a vX.Y.Z -m "vX.Y.Z"`, then `git push origin main --follow-tags`.
4. `gh release create vX.Y.Z --notes-file <that version's notes>` (or draft it
   from the tag on GitHub).

## Migrations

Files are named `<YYYYMMDDHHMMSS>_<name>.sql`, matching the version Supabase
records when one is applied. The Supabase GitHub check compares the two and
fails on any live version missing here, so a migration applied from the
dashboard or MCP has to be added under the same version.

## Setup

```bash
cp .env.example .env.local   # fill in from the Supabase dashboard
npm install
npm run dev
```

| Script | |
|---|---|
| `npm run dev` | dev server on :3000 |
| `npm run build` | production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | eslint |
| `npm test` | vitest — advisor guardrails, urgency, Flora, Reclaim, ICS writing (65 tests) |
| `/preview` | design gallery of every screen, no data, dev-only |
| `npm run db:types` | regenerate `src/lib/supabase/database.types.ts` (needs the Supabase CLI) |

## Layout

```
src/app/(app)/           authenticated shell — bottom nav, phone-width column
src/app/sign-in/         magic-link sign-in
src/app/auth/            callback + sign-out route handlers
src/components/flora/    Flora, the guide — character + speech bubble
src/components/screens/  presentational screen bodies (no data access)
src/components/ui/       Card, PillButton, SectionHeading, ModuleTile, BlobBackground, icons
src/app/preview/         design gallery — real components, sample props, 404 outside dev
src/lib/advisor/         the Skip Advisor engine + its tests. Pure, no UI imports.
src/lib/work/            urgency ranking for hand-ins and exams + its tests. Pure.
src/lib/flora/           what Flora says, as a pure priority list + its tests
src/lib/reclaim/         the freed-hours planner + its tests. Pure.
src/lib/calendar/        RFC 5545 writer for the outgoing feed + its tests. Pure.
src/lib/ics/vision.ts    reads a timetable out of a photo or PDF via Groq
src/lib/supabase/        browser / server / proxy clients, generated DB types
src/proxy.ts             session refresh + route guard (Next 16's `middleware` successor)
supabase/migrations/     schema, RLS — one file per live migration, named by its version
```

## Things worth knowing before you touch the code

- **RLS is on every table** and was written in the first migration. Any new table needs
  its policy in the same migration, not later.
- **`cn()` is a configured tailwind-merge**, not the stock one. Our font-size tokens
  (`text-body`, `text-label`, …) have to be registered or tailwind-merge mistakes them
  for colours and silently drops `text-*` colour classes.
- **The icon set is a placeholder.** P5 replaces it with the real hand-drawn set. Do not
  mix in Lucide/Feather in the meantime — a split icon family is instantly visible.
- **Screen bodies are presentational.** Pages fetch, `src/components/screens/*` renders.
  `/preview` uses the same components, so the gallery cannot drift from the app.
- **Never render a date on the server.** Node formats `14:00` where the browser formats
  `02:00 PM`, and on Vercel the server runs in UTC while the student does not. Use
  `<LocalTime>` / `useNow()`; both return nothing until mount, which is what keeps
  hydration honest.
- **`layoutId` is page-global.** Scope it with `useId()`, or two instances of a component
  on one page fight over the same sliding pill.
- **Never put `-z-10` on an overlay pill.** It lands behind the *ancestor's* background,
  not just behind its siblings. Order by DOM position and mark the content `relative`.
- **The advisor's guardrails are not tunable.** Weights are; the hard rules that force
  GO (something due, assessed, monitored attendance, already below threshold, this
  absence drops you below) are covered by tests that assert `skip_fine` is unreachable.
  If you change them, change the tests deliberately, not to make them pass.
- **Colour contrast gets measured, not eyeballed.** `--color-muted` shipped at 2.24:1 on
  white — an AA failure across every secondary label. It is now 5.82:1. Text that sits
  over a background blob needs `text-ink/80`, not muted.
- **Guest mode is a real anonymous Supabase user**, not an auth bypass. It has a genuine
  session, so every RLS policy applies unchanged and no downstream code special-cases it.
  `upgradeAccount` on Me attaches an email and password to the same user id, so a guest
  keeps everything they entered.
- **Every Server Action verifies ownership, not just authentication.** An action is a
  public POST endpoint. RLS scopes the row you write; it says nothing about which row a
  foreign key points at. `markAttendance` shows the pattern: take the id from the client,
  re-read it under the session, bail if it is not theirs.
- **Flora never invents.** Her mood and line come from `src/lib/flora/lines.ts`, a pure
  priority list over real state. If you give her a new line, give it a rank — a mascot
  who says something arbitrary is wallpaper, and a cheerful one during a crisis is worse.
- **Two Supabase advisor warnings are expected, not bugs.** `calendar_feed` is a
  security-definer function callable by `anon` *on purpose* — Google fetches the feed
  with no session, so the unguessable token in the URL is the credential. And
  `auth_allow_anonymous_sign_ins` fires on every table because guest mode is a real
  anonymous user; each guest still only reaches their own rows via `auth.uid()`.
- **Never `npm run build` while `next dev` is running** — they share `.next`, and the
  build leaves the dev server serving 500s until it is restarted.
- **Backslashes get eaten in transit.** The ICS escaper and its tests are written with
  `String.fromCharCode(92)` rather than literals: a lost backslash there makes tests
  pass for the wrong reason. It already hid a bug where semicolons went unescaped.
- **Groq structured outputs are best-effort, not guaranteed.** `qwen/qwen3.8-27b` does
  not support strict mode, so the JSON schema is a hint. Everything that comes back is
  parsed and Zod-validated in `vision.ts`, with one retry — never trusted.
- **Groq's vision model takes images only.** PDFs go through `unpdf` text extraction
  first. A scanned PDF has no text layer, and that case is reported rather than silently
  returning an empty timetable.
- **Money is computed in the browser.** "Today", "this week" and "this month" are the
  student's local ones and the server runs in UTC, so `money/page.tsx` only fetches rows
  and `summarize()` (`src/lib/money/budget.ts`, pure and tested) runs on the client. The
  one date the server accepts from the browser — the day a budget starts — is checked to
  be within a day of its own clock.
- **Food nearby comes from OpenStreetMap's Overpass API**, keyless. Queries are cached for a
  day per ~110 m cell through Next's fetch cache, fall back to a mirror when the main
  instance is busy, and stream in under `<Suspense>` so a slow map never holds up the
  budget. The OSM attribution under the list is a licence requirement; keep it.
- **Nothing about location is tracked.** The campus pin is set once, by the student, from
  a single geolocation fix or a pasted coordinate, and it is the only location UniBoard
  ever sends anywhere.
- **Never build a wall-clock time on the server.** `setHours()` and `new Date("2026-09-25T14:00")`
  use the server's zone, which on Vercel is UTC — that put every hand-typed class, photo
  import and zone-less calendar feed 5½ hours late for a student in Pune. Forms carry the
  browser's zone in a hidden `tz` field (`<TimeZoneField />`); the server converts with
  `src/lib/time/zone.ts`. Calendar feeds that name a TZID without defining it are read in
  that zone.
- **Universities are shared, thresholds are not.** Students *join* a university record,
  matched ignoring case, spacing and punctuation (`name_key`, a generated column, with a
  unique index) or by short name ("pict"). Only its creator can edit it. Each student's
  attendance threshold lives on their own profile; the university's is just the default.
- **Board events are the one place students see each other's rows.** A shared event is
  readable by everyone whose profile points at the same university and writable only by
  its author (`board_events_*` policies). What a classmate does with it — pin or hide —
  lives in `board_event_marks`, whose insert policy only accepts events the student can
  see. Authors are never named. The calendar feed re-checks the university on every fetch
  because it runs as security definer.
- **The soft board's look is CSS, not images.** `.felt` in `globals.css` layers two SVG
  turbulence textures over the felt colour; card shapes are `.card-index`, `.card-sticky`,
  `.card-polaroid`, `.card-tag` and `.card-torn`, all reading the card's colour from
  `--tone`. Shapes that use `clip-path` lose `box-shadow`, so the shadow is a
  `drop-shadow` on the wrapper (`.card-hang`). Text never sits directly on the felt.
- **Light mode only**, by decision. The design is built on white (PLAN.md §8).
# UniBoard
