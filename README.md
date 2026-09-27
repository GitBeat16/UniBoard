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
| Auth | Google, password, magic link, or guest (Supabase anonymous user) |
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
| **Google: on**, with its client ID and secret | Powers "Continue with Google". See below. |
| **Allow manual linking: on** | Lets a guest keep their account with "Keep it with Google" on Me. |

Check the current state without the dashboard:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
```

`mailer_autoconfirm` should be `true` and `external.anonymous_users` should be `true`.

### Google sign-in

The keys live in Supabase, not in this app's `.env` — the app only asks Supabase to
start the sign-in and gets the student back at `/auth/callback`.

1. Google Cloud Console → APIs & Services → **OAuth consent screen**: set it up
   (External, app name UniBoard, your support email; scopes `email`, `profile`, `openid`).
2. **Credentials → Create credentials → OAuth client ID**, type *Web application*:
   - Authorised JavaScript origins: `https://uni-board-flax.vercel.app`, `http://localhost:3000`
   - Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows the exact one on its Google provider page)
3. Supabase → Authentication → Sign In / Providers → **Google**: paste the client ID and
   secret, enable it. Turn on **Allow manual linking** on the same page for guests.
4. The Redirect URLs above already cover `/auth/callback`; nothing else to add.

`external.google` in the settings check above turns `true` once it's on.

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
src/app/welcome/         the public landing page — what UniBoard is, and the tour gallery
src/app/(app)/           authenticated shell — bottom nav on phones, sidebar on laptops
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
- **Ask the model for the grid, not for the classes.** A university timetable has merged
  cells, break rows, and cells holding a different subject per batch. Asked for a list of
  classes, the model quietly drops what it loses track of — a whole weekday can come back
  with one hour on it. So it transcribes the grid instead, a row per time slot and a cell
  per weekday, and `src/lib/ics/grid.ts` does the judging: merged runs, breaks, batch
  labels, per-batch rooms, session types. An unreadable cell then arrives empty rather
  than missing, and every rule is testable without a model — `grid.test.ts` and
  `pipeline.test.ts` run the real PICT SY-III timetable end to end.
- **Home asks the database for a verdict, not the term.** It used to page
  through every class and every attendance mark just to say "one module is
  below its threshold". `attendance_summary()` (security invoker, so RLS still
  scopes it) returns four counts per module, mirroring `countSessions()` rule
  for rule; `attendanceFromCounts()` turns them into the same verdict the
  Timetable reaches from the classes themselves. Both were run on one fixture —
  the SQL as a signed-in student inside a rolled-back block — and the numbers
  are pinned in `stats.test.ts`, so if either side drifts a test fails. The
  college cut-off is the end of its day in UTC on both sides.
- **Home reads like a day, not a dashboard.** A sky at the top follows the
  viewer's clock (dawn, day, dusk, night; the sun or moon on its arc), with
  Flora in it. Under it, the whole of today as a timeline — classes, named
  gaps (lunch, a break, free time), a rail with a dot for now — then the next
  class as a ticket and what needs you, beside four glance tiles and the week
  as seven squares. The maths is `src/lib/home/day.ts`, pure and in local
  time. Every tile reuses its own screen's code: the money tile runs Money's
  `summarize()`, attendance comes from the same counts as the Timetable. The
  streak counts days with every class marked; weekends neither count nor
  break it, and today only counts once it is marked, so a morning with a class
  still to mark never shows a broken streak.
- **Every tap has a feel.** One capture-phase `pointerdown` listener
  (`src/components/tap-feedback.tsx`) gives buttons and links a short buzz and,
  when sounds are on, a soft tick; Flora (`data-feedback="flora"`) gets her own
  double bump. Anything can opt out with `data-feedback="none"`. Haptics are on
  by default and off under reduced motion; iPhones do not let web pages
  vibrate, so there it is a no-op. Sound stays off until asked for. Both
  switches are on Me.
- **Every subject is correctable, because the photo is not perfect.** Tap a
  subject's attendance card for its sheet: name, code, colour, threshold, and
  the college's figure (all three fields or none — a count without a date
  cannot be carried forward; `src/lib/attendance/subject-form.ts`, tested). A
  figure typed by hand is recorded as `hand`. Renaming onto another subject's
  name is refused and points at merge instead. **Merge** is one Postgres
  function, `merge_modules()` (security invoker, one transaction): classes and
  their marks, hand-ins and exams move across, the college figure and code
  survive, then the empty duplicate goes — done in several requests, a failure
  halfway could let the cascade take classes with it. Delete asks twice. A
  single class's mark can be changed to any status, or cleared.
- **The loader is drawn on the server and timed by CSS.** On a first load the
  app's JavaScript arrives after the page, so a JS-timed Flora never got her
  turn. Now she is in the HTML with a fixed first trick (`defaultActivity`) and
  `.flora-reveal` fades her in 150 ms after she lands; the browser swaps in a
  random trick before then. Opening the app shows a splash once per browser
  session: server-drawn, hidden before paint on a same-session reload by an
  inline script that only sets `data-splash` on `<html>` (hence
  `suppressHydrationWarning` there), lifted when the app is ready and at least
  1.2 s have passed — and lifted by CSS after 6 s if the JavaScript never comes.
  The key lives in `src/lib/flora/splash.ts`, a plain module: exported from a
  client file it reached the server layout as a client reference, not a string.
- **Flora keeps you company while a screen loads.** She fades in 150 ms after
  a loading screen lands, so an instant one does not flash her. Past that she walks on with a trick
  fitted to the screen (`src/lib/flora/loading.ts` picks it; the drawing is
  `src/components/flora/loading/scenes.tsx`): watering, pinning, counting,
  juggling and reading on Home; reading or counting on Timetable; pinning or
  juggling on the Board; stacking coins on Money. She only sleeps after 11 pm.
  Tap her for another trick (with a chirp, if her sound is on). Tips under her
  each describe something real — never a fake percentage. Every trick is the
  real Flora with props on a steady beat; a beat remounts the run, which is
  how state resets without setting it inside an effect. Under reduced motion
  it is a still Flora and one tip.
- **Home's loading state is scoped to Home.** `loading.tsx` lives in the
  `(home)` route group; one level up it would wrap Timetable, Board and Money
  too and show them a Home-shaped skeleton. The skeleton mirrors the real grid,
  ticket and tiles so nothing jumps when the page lands.
- **Flora holds a queue, not a line.** `observations()` collects everything
  true about the screen right now, best first; `nextObservation()` picks what
  to say, skipping anything said recently and never repeating what is already
  on screen. So tapping her moves her on, and a re-render never makes her
  blurt. `isStale()` is the other half: a line only exists while the thing it
  describes does, so a lapsed reaction or a count she has just fixed makes her
  move rather than keep asserting it.
- **She only interrupts for something she has never said.** Text that rewrites
  itself while you read it is restless, and every change is announced to a
  screen reader — so the 90-second timer only fires for a genuinely new
  thought, and everything else waits for a tap.
- **Her voice is synthesised, not shipped.** `src/lib/flora/sound.ts` builds a
  short motif per mood out of sine tones — nothing to download, nothing to
  404, and tuning it is changing a number. It is off by default and stays off:
  a page that makes a noise on arrival is a page people close. The
  AudioContext is only resumed inside a click, because every browser suspends
  it until a gesture.
- **`tellFlora()` is how a screen tells her what just happened.** A card three
  levels down a list knows a class was marked; she lives at the top of the
  page. A module-level channel beats threading a callback through every
  component in between for a message that is fire-and-forget. Reactions last
  six seconds — a mascot still congratulating you a minute later is one you
  stop reading.
- **The timetable must be correctable by hand.** A read grid is close, never
  exact, and colleges move classes. Every class opens a sheet that can change
  its module, kind, room and times, or remove it — for that one class or for
  every later week of the same slot, which is what `series_id` is for
  (`src/lib/ics/series.ts` derives it from the slot, so a re-import lands on the
  same series instead of splitting it). Weeks already gone are never touched:
  attendance hangs off them.
- **The college's attendance figure beats ours.** The app can only count
  classes it knows about, which starts at import; the college has been counting
  since the term began, and its number decides who sits the exam. So it is
  imported (screenshot, or a link when the page is public) into
  `modules.official_*` as a dated baseline, and `moduleAttendance()` treats it
  as the opening balance — classes on or before that day are skipped entirely,
  so nothing is counted twice, and only what is marked after it is added.
  `src/lib/attendance/match.ts` maps portal subjects to modules by code, name,
  initials and whole-word containment, and refuses to guess when two modules
  fit. Portals sit behind a login, so the link route says so plainly rather
  than letting a model invent numbers off a sign-in page.
- **Timetables print the afternoon on a 12-hour clock** ("12:45 to 01:45"). A faithful
  transcription would file it at one in the morning, so `asDayOrder()` walks the rows
  down the day and adds twelve hours to any that goes backwards.
- **Batches are asked about, never guessed.** When the grid names more than one batch, the
  import stops and offers them; the grid travels back with the question in a hidden field,
  so answering costs no second call to the model. Lectures belong to everyone, practicals
  only to the chosen batch, and a session split by batch is roomed by batch too.
- **A class's `external_uid` must name its slot completely** — module, type, weekday and
  both times. Postgres rejects an upsert whose batch names the same row twice, so a uid
  that left out the weekday made any module meeting twice a week fail the whole import
  with "ON CONFLICT DO UPDATE command cannot affect row a second time". The rows are also
  keyed by uid before the upsert, as a second line of defence.
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
- **The landing page is the front door.** A signed-out visitor at `/` is sent to
  `/welcome`, not to the sign-in form; a deep link to a signed-in screen still goes to
  `/sign-in`. `/welcome` and `/media` are public paths in `src/lib/supabase/middleware.ts`.
- **The landing page's motion comes from React Bits** (reactbits.dev, by David Haz;
  MIT + Commons Clause — fine inside an app, not for reselling the components). The
  copies live in `src/components/reactbits/` with the notice and `LICENSE.md` beside
  them, and each file says what was changed for UniBoard. Most need nothing beyond
  `motion`: BlurText (the closing line), RotatingText ("it keeps your ___
  straight"), ShinyText (the eyebrow), ScrollVelocity (the felt band), CountUp (the
  numbers), SpotlightCard (the feature and privacy cards), Magnet (the calls to
  action) and ClickSpark (sparks on click). `landing-bits.tsx` dresses them in
  UniBoard's colours; the page itself stays a static server component. Without
  JavaScript a `<noscript>` rule un-blurs the closing line; under reduced motion the
  band holds still and the buttons stop leaning. Two go further:
  - **TextPressure** (the hero headline, "Your whole uni day, on one board.", one
    instance per line) needs a variable font; Roboto Flex is self-hosted with
    `next/font` on `/welcome` only, never fetched at runtime. Its original global
    `.flex` class is renamed — it would have overridden Tailwind's `flex` everywhere.
  - **CircularGallery** (the tour) is WebGL, through `ogl` (the page's one
    added dependency). Its input is scoped to the gallery — the original took the
    wheel and drags from the whole window — and a vertical scroll passes through
    to the page. The caption list under it follows the card in the middle and
    turns the arc when an item is chosen (dots on a phone). If WebGL fails, the
    same stills show in a plain swipeable row. RotatingText was measured, not
  eyeballed: with its default spring the word was blank a third of every cycle.
- **The launch film is code too.** `/preview/launch` (dev only) plays a ~55 s, 1920×1080
  film with a scrubber: the night-before-a-deadline opening, the reveal, then the app's
  features on coral flash cuts. Every frame is a pure function of the frame number
  (`src/lib/launch/film.ts`, scenes in `src/components/launch/`), so it renders exactly:
  `node tools/render-launch.mjs --audio launch-out/uniboard-launch-score.wav` steps a fake
  clock one frame at a time and pipes screenshots into ffmpeg
  (`--stills 30,400` saves single frames to check; `--half` renders at 960×540).
  The score is composed in `tools/launch-score.py` (numpy + scipy, no samples, so no
  licences) from the same scene lengths — from "statement" on, scenes are whole beats
  (14 frames ≈ 128.6 BPM) so every flash lands on a downbeat. Renders go to `launch-out/`,
  which git ignores. The one gotcha: motion's opacity fades run on the compositor, which
  the fake clock can't drive, so film scenes animate entrances themselves and use app
  components in their still form (`Logo animated={false}`, `Flora enter="none"`).
- **The tour stills are the real app**, not mock-ups: `/preview/tour?scene=<id>`
  (dev only) draws each screen in `src/lib/tour.ts` with sample data, and
  `node tools/capture-tour.mjs [base-url]` (with `next dev` running; needs Playwright and
  ffmpeg) photographs each at 2× into `public/media/tour/<id>.webp`. Add a scene to the
  list, give it a framing in `src/components/landing/tour.tsx`, capture, done.
- **The logo is the product in miniature** — a felt board with one pinned card
  (`src/components/brand/logo.tsx`). It animates once on mount and again on hover, and
  stops moving entirely under `prefers-reduced-motion`. `src/app/icon.svg` is the same
  mark, still, for the browser tab.
- **Light mode only**, by decision. The design is built on white (PLAN.md §8).
# UniBoard
