-- Live version 20260920151750. Backfilled into the repo so a fresh database matches production.

-- A subscribable calendar feed.
--
-- Google Calendar fetches the URL anonymously — it has no session — so the
-- token in the URL is the credential. It is a random uuid (122 bits), the same
-- model every calendar provider uses for private feeds, and the student can
-- roll it to revoke every existing subscription.
alter table profiles
  add column calendar_token uuid not null default gen_random_uuid();

create unique index profiles_calendar_token_idx on profiles(calendar_token);

comment on column profiles.calendar_token is
  'Bearer secret for the public .ics feed. Rolling it revokes existing subscriptions.';

-- security definer because the caller is anonymous by design. The token is
-- checked here; an unknown token returns zero rows rather than an error, so the
-- function cannot be used to probe which tokens exist.
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
    select id from public.profiles where calendar_token = p_token
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
  left join public.modules m on m.id = e.module_id;
$fn$;

revoke execute on function public.calendar_feed(uuid) from public;
grant execute on function public.calendar_feed(uuid) to anon, authenticated;
