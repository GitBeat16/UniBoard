-- The soft board (v0.4): shared universities, campus events, card shapes.

-- ---------------------------------------------------------------- universities
-- Universities become shared records students JOIN, so classmates can see the
-- same campus events. Names are matched ignoring case, spacing and
-- punctuation: "pune institute of computer  technology" and "Pune Institute
-- of Computer Technology." are the same place. [:alnum:] rather than [a-z0-9]
-- so a name written in Devanagari still has a key.
alter table university_profiles
  add column short_name text
    constraint university_profiles_short_len check (short_name is null or char_length(btrim(short_name)) between 2 and 16),
  add column name_key text generated always as (
    btrim(regexp_replace(lower(name), '[^[:alnum:]]+', ' ', 'g'))
  ) stored,
  add column short_key text generated always as (
    nullif(regexp_replace(lower(coalesce(short_name, '')), '[^[:alnum:]]+', '', 'g'), '')
  ) stored,
  add constraint university_profiles_name_len check (char_length(btrim(name)) between 3 and 120);

alter table university_profiles alter column is_public set default true;

-- One shared record per name, whatever the capitals.
create unique index university_profiles_public_name_key
  on university_profiles(name_key) where is_public;
create index university_profiles_public_short_key
  on university_profiles(short_key) where is_public and short_key is not null;

comment on column university_profiles.attendance_threshold is
  'The default for students who join. Each student''s own number lives on profiles.attendance_threshold.';

-- A student's threshold is theirs. Joining a shared university must never let
-- one student's setting change another's "you can miss N more".
alter table profiles
  add column attendance_threshold numeric(5,2)
    constraint profiles_threshold_range check (attendance_threshold between 0 and 100);

-- ---------------------------------------------------------------- board events
alter table board_events
  add column visibility text not null default 'private'
    constraint board_events_visibility check (visibility in ('private', 'university')),
  add column card_shape text
    constraint board_events_card_shape check (card_shape in ('index', 'sticky', 'polaroid', 'tag', 'torn')),
  add column details text
    constraint board_events_details_len check (details is null or char_length(details) <= 500),
  add constraint board_events_title_len check (char_length(btrim(title)) between 2 and 120),
  add constraint board_events_location_len check (location is null or char_length(location) <= 120),
  add constraint board_events_time_order check (ends_at is null or ends_at > starts_at),
  add constraint board_events_shared_needs_uni check (visibility = 'private' or university_id is not null),
  add constraint board_events_tags_count check (cardinality(tags) <= 6);

create index board_events_uni_start_idx
  on board_events(university_id, starts_at) where visibility = 'university';

alter table assignments
  add column card_shape text
    constraint assignments_card_shape check (card_shape in ('index', 'sticky', 'polaroid', 'tag', 'torn'));
alter table exams
  add column card_shape text
    constraint exams_card_shape check (card_shape in ('index', 'sticky', 'polaroid', 'tag', 'torn'));

-- Own-rows-only is no longer enough: classmates read shared events. Writes
-- stay with the author, and a shared event can only be posted to the
-- university the author actually belongs to.
drop policy board_events_own on board_events;

create policy board_events_read on board_events for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      visibility = 'university'
      and university_id = (select p.university_id from public.profiles p where p.id = (select auth.uid()))
    )
  );

create policy board_events_insert on board_events for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      visibility = 'private'
      or university_id = (select p.university_id from public.profiles p where p.id = (select auth.uid()))
    )
  );

create policy board_events_update on board_events for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      visibility = 'private'
      or university_id = (select p.university_id from public.profiles p where p.id = (select auth.uid()))
    )
  );

create policy board_events_delete on board_events for delete to authenticated
  using (user_id = (select auth.uid()));

-- What each student did with someone else's shared event: pinned it to their
-- own board, or hid it. One row per student per event.
create table board_event_marks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references board_events(id) on delete cascade,
  kind       text not null constraint board_event_marks_kind check (kind in ('save', 'hide')),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index board_event_marks_event_idx on board_event_marks(event_id);

alter table board_event_marks enable row level security;

-- The EXISTS runs under board_events' own read policy, so a student can only
-- mark an event they are allowed to see.
create policy board_event_marks_own on board_event_marks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.board_events e where e.id = event_id)
  );

-- ---------------------------------------------------------------- calendar feed
-- Adds the student's own pinned events and the shared ones they saved. The
-- function is security definer (Google fetches anonymously), so it re-checks
-- that a saved event is still shared with the student's current university.
create or replace function public.calendar_feed(p_token uuid)
returns table (
  kind        text,
  uid         text,
  title       text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  location    text,
  description text
)
language sql
security definer
set search_path = ''
stable
as $fn$
  with owner as (
    select id, university_id from public.profiles where calendar_token = p_token
  )
  select
    'class'::text,
    'class-' || s.id::text,
    coalesce(m.name, 'Class') ||
      case s.type when 'lecture' then '' else ' (' || s.type::text || ')' end,
    s.starts_at,
    s.ends_at,
    s.room,
    case when s.has_submission then 'Something is due in this class.'
         when s.is_assessed then 'This session is assessed.'
         else null end
  from public.class_sessions s
  join owner on owner.id = s.user_id
  left join public.modules m on m.id = s.module_id

  union all

  select
    'study'::text,
    'study-' || b.id::text,
    b.title,
    b.starts_at,
    b.ends_at,
    null,
    'Planned in UniBoard.'
  from public.study_blocks b
  join owner on owner.id = b.user_id

  union all

  select
    'deadline'::text,
    'due-' || a.id::text,
    'Due: ' || a.title,
    a.due_at,
    a.due_at + interval '30 minutes',
    null,
    coalesce(m.name, '')
  from public.assignments a
  join owner on owner.id = a.user_id
  left join public.modules m on m.id = a.module_id
  where a.status in ('not_started', 'in_progress')

  union all

  select
    'exam'::text,
    'exam-' || e.id::text,
    'Exam: ' || e.title,
    e.starts_at,
    e.starts_at + interval '2 hours',
    e.room,
    coalesce(m.name, '')
  from public.exams e
  join owner on owner.id = e.user_id
  left join public.modules m on m.id = e.module_id

  union all

  select
    'event'::text,
    'event-' || ev.id::text,
    ev.title,
    ev.starts_at,
    coalesce(ev.ends_at, ev.starts_at + interval '1 hour'),
    ev.location,
    ev.details
  from public.board_events ev
  join owner on owner.id = ev.user_id
  where ev.pinned

  union all

  select
    'event'::text,
    'event-' || ev.id::text,
    ev.title,
    ev.starts_at,
    coalesce(ev.ends_at, ev.starts_at + interval '1 hour'),
    ev.location,
    ev.details
  from public.board_event_marks k
  join owner on owner.id = k.user_id
  join public.board_events ev on ev.id = k.event_id
  where k.kind = 'save'
    and ev.visibility = 'university'
    and ev.university_id = owner.university_id
    and ev.user_id <> owner.id;
$fn$;

revoke execute on function public.calendar_feed(uuid) from public;
grant execute on function public.calendar_feed(uuid) to anon, authenticated;
