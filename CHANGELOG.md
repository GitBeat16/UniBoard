# Changelog

Every release is a git tag (`vX.Y.Z`) and a GitHub release with these notes.
Versions follow [SemVer](https://semver.org): while UniBoard is pre-1.0, a new
feature phase bumps the **minor** number and a fix-only release bumps the **patch**.

Planned: **0.2.0** design pass · **0.3.0** Money · **0.4.0** the soft board and
campus events · **1.0.0** when every module in PLAN.md is live.

## [Unreleased]

## [0.3.0] — 2026-09-21

Money (M6 in PLAN.md).

### Added
- **A budget.** Set one number per week or per month, optionally with a food
  cap inside it, in your own currency (₹ by default). The sketched ring shows
  what today can still take, what has gone, and an even share per day for
  the rest of the period. A status word says whether you are on track,
  running quick, or over.
- **Logging a spend.** Amount, one of five categories and an optional note.
  This period's spends are listed underneath, and any of them can be removed.
- **Food nearby.** Pin your campus once, either from where you are standing or
  by pasting coordinates from Google Maps. Cafés, canteens and restaurants
  from OpenStreetMap are then listed by walking time, with a veg-friendly
  filter, opening hours where they are mapped, a link to open each place in
  maps, and a button to log a spend there.
- Flora knows about money: she mentions an overspent or fast-running budget,
  but a module under its attendance threshold still outranks it.

### Notes
- OpenStreetMap rarely has prices for Indian cafés, so UniBoard shows no price
  bands rather than guessing any.
- "Today" and "this week" are worked out on your phone, in your time zone.

## [0.2.0] — 2026-09-21

The design pass (P5 in PLAN.md).

### Added
- A hand-drawn icon set: every icon redrawn with a visible pen wobble and faded
  hatching, plus new ones the next releases need (location, tag, bookmark,
  walk, users, plus, check, close, sparkle).
- Sketched charts: attendance and goal rings and the Skip Advisor's gauge are
  now hand-drawn with rough.js, with hatching that draws itself in. Each chart
  keeps the same wobble every time you open it.
- Empty-state illustrations for the timetable, the board, money and places,
  which sketch themselves in when a screen has nothing to show yet.
- The maroon felt colours the soft board will use.

## [0.1.1] — 2026-09-21

### Fixed
- Attendance counted a shorter term than you actually have once a timetable
  passed 1,000 classes. Supabase stops at 1,000 rows without saying so; every
  sessions/records read now pages through the whole term.
- Home skipped a class that had already started. It now shows it as **On now**,
  with when it ends.
- Hand-ins and exams on Home carry their real module name and colour.
- Timetable photos over 1 MB failed to upload. Photos are now shrunk in the
  browser, and uploads are capped at 4 MB to fit Vercel's 4.5 MB request limit.
- Magic links return you to the deployment you signed in on; the calendar feed
  link always uses the production address.

### Changed
- Functions run in Mumbai (`bom1`), next to the database, instead of Washington.
- Migrations are named by their live version (`20260920090443_…`), which is what
  Supabase's GitHub integration checks. Three that only existed on the live
  project are now in the repo.
- The version and commit show at the bottom of **Me**.

## [0.1.0] — 2026-09-20

First deployed version: P0–P4 of PLAN.md.

### Added
- Timetable import from a calendar link, an .ics file, by hand, or from a photo
  or PDF of the timetable.
- Attendance per module, with "you can miss N more".
- The Skip Advisor: an explained go-or-skip call with hard guardrails.
- The Board for hand-ins and exams, ranked by urgency.
- Reclaim: a skipped class becomes a real plan for the freed hours.
- Flora, the guide; password, magic-link and guest sign-in; a subscribable
  calendar feed.
