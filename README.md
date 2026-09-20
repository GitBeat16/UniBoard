# UniBoard

Your whole uni day, on one board. Timetable in → attendance tracked → an honest
go-or-skip call → a plan for whichever you choose.

See [PLAN.md](PLAN.md) for the product plan, design system and phase breakdown.

## Status

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
supabase/migrations/     schema, RLS
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
- **Light mode only**, by decision. The design is built on white (PLAN.md §8).
# UniBoard
