-- UniBoard initial schema
-- Every user-owned table gets RLS on auth.uid() in this same migration.
-- This app holds a student's location, spending and attendance record; retrofitting
-- RLS later is both risky and miserable.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type session_type        as enum ('lecture','lab','seminar','tutorial','workshop','other');
create type attendance_status   as enum ('present','absent','late','excused','unknown');
create type attendance_source   as enum ('manual','checkin','imported');
create type assignment_status   as enum ('not_started','in_progress','submitted','graded');
create type goal_kind           as enum ('habit','project');
create type study_block_source  as enum ('reclaim','manual');
create type budget_kind         as enum ('week','month');
create type skip_verdict        as enum ('go_matters','go_if_you_can','your_call','skip_fine');

-- ---------------------------------------------------------------- reference data

-- Shared across users. No university-specific fact is ever hardcoded in the app.
create table university_profiles (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  country              text,
  attendance_threshold numeric(5,2) not null default 75.00,
  term_start           date,
  term_end             date,
  ics_hint             text,           -- where this uni hides its calendar export
  is_public            boolean not null default false,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now()
);

create table buildings (
  id            uuid primary key default gen_random_uuid(),
  university_id uuid not null references university_profiles(id) on delete cascade,
  name          text not null,
  lat           double precision,
  lng           double precision
);
create index buildings_university_idx on buildings(university_id);

-- Venue cache (OSM/Foursquare results), shared so we're not refetching per user.
create table venues (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique,
  name        text not null,
  lat         double precision not null,
  lng         double precision not null,
  price_band  smallint check (price_band between 1 and 4),
  rating      numeric(3,2),
  cuisine     text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- user data

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  university_id uuid references university_profiles(id) on delete set null,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table modules (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  code                text,
  name                text not null,
  color_token         text not null default 'sky',
  credits             smallint,
  attendance_required boolean not null default true,
  threshold           numeric(5,2),   -- null = inherit from the university profile
  created_at          timestamptz not null default now()
);
create index modules_user_idx on modules(user_id);

-- Concrete occurrences, not RRULEs. Attendance is per-occurrence, so expanding at
-- import time keeps every downstream query trivial. series_id groups a repeating class.
create table class_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  module_id      uuid not null references modules(id) on delete cascade,
  series_id      uuid,
  type           session_type not null default 'lecture',
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  room           text,
  building_id    uuid references buildings(id) on delete set null,
  is_assessed    boolean not null default false,
  has_submission boolean not null default false,
  is_recorded    boolean not null default false,
  external_uid   text,           -- ICS UID, for idempotent re-import
  created_at     timestamptz not null default now(),
  constraint class_sessions_time_order check (ends_at > starts_at),
  unique (user_id, external_uid)
);
create index class_sessions_user_start_idx on class_sessions(user_id, starts_at);
create index class_sessions_module_idx     on class_sessions(module_id);

create table attendance_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null references class_sessions(id) on delete cascade,
  status      attendance_status not null,
  source      attendance_source not null default 'manual',
  recorded_at timestamptz not null default now(),
  unique (session_id)
);
create index attendance_user_idx on attendance_records(user_id);

create table assignments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  module_id       uuid references modules(id) on delete set null,
  title           text not null,
  due_at          timestamptz not null,
  weight          numeric(5,2),
  status          assignment_status not null default 'not_started',
  estimated_hours numeric(4,1),
  created_at      timestamptz not null default now()
);
create index assignments_user_due_idx on assignments(user_id, due_at);

create table exams (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  title     text not null,
  starts_at timestamptz not null,
  room      text,
  topics    text[] not null default '{}'
);
create index exams_user_start_idx on exams(user_id, starts_at);

create table goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  kind            goal_kind not null default 'project',
  target_per_week numeric(4,1),
  progress        numeric(5,2) not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index goals_user_idx on goals(user_id);

create table study_blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  title       text not null,
  source      study_block_source not null default 'manual',
  linked_type text,     -- 'assignment' | 'exam' | 'goal'
  linked_id   uuid,
  done        boolean not null default false,
  constraint study_blocks_time_order check (ends_at > starts_at)
);
create index study_blocks_user_start_idx on study_blocks(user_id, starts_at);

create table budget_periods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         budget_kind not null default 'week',
  currency     text not null default 'GBP',
  food_budget  numeric(10,2),
  total_budget numeric(10,2),
  starts_at    date not null
);
create index budget_periods_user_idx on budget_periods(user_id, starts_at);

create table expenses (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  amount   numeric(10,2) not null,
  category text not null default 'food',
  venue_id uuid references venues(id) on delete set null,
  note     text,
  spent_at timestamptz not null default now()
);
create index expenses_user_spent_idx on expenses(user_id, spent_at);

create table board_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  university_id uuid references university_profiles(id) on delete set null,
  title         text not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  location      text,
  tags          text[] not null default '{}',
  source        text not null default 'manual',
  pinned        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index board_events_user_start_idx on board_events(user_id, starts_at);

-- Logged so the advisor can be tuned against what this student actually did,
-- rather than living on fixed weights forever.
create table skip_decisions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid not null references class_sessions(id) on delete cascade,
  verdict       skip_verdict not null,
  score         numeric(6,3) not null,
  reasons       jsonb not null default '[]'::jsonb,
  chose_to_skip boolean,
  decided_at    timestamptz not null default now()
);
create index skip_decisions_user_idx on skip_decisions(user_id, decided_at);

-- ---------------------------------------------------------------- new-user trigger

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS

alter table profiles           enable row level security;
alter table modules            enable row level security;
alter table class_sessions     enable row level security;
alter table attendance_records enable row level security;
alter table assignments        enable row level security;
alter table exams              enable row level security;
alter table goals              enable row level security;
alter table study_blocks       enable row level security;
alter table budget_periods     enable row level security;
alter table expenses           enable row level security;
alter table board_events       enable row level security;
alter table skip_decisions     enable row level security;
alter table university_profiles enable row level security;
alter table buildings          enable row level security;
alter table venues             enable row level security;

-- Own-rows-only, for every table carrying a user_id.
-- (select auth.uid()) rather than auth.uid() so the planner evaluates it once
-- per query instead of once per row.
do $$
declare t text;
begin
  foreach t in array array[
    'modules','class_sessions','attendance_records','assignments','exams',
    'goals','study_blocks','budget_periods','expenses','board_events','skip_decisions'
  ]
  loop
    execute format(
      'create policy %I on %I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t || '_own', t);
  end loop;
end $$;

create policy profiles_own on profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Reference data: readable when shared, writable only by whoever added it.
create policy university_profiles_read on university_profiles for select to authenticated
  using (is_public or created_by = (select auth.uid()));
create policy university_profiles_insert on university_profiles for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy university_profiles_update on university_profiles for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create policy buildings_read on buildings for select to authenticated using (true);
create policy buildings_insert on buildings for insert to authenticated with check (true);

create policy venues_read on venues for select to authenticated using (true);
create policy venues_insert on venues for insert to authenticated with check (true);
