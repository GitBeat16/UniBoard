-- Per-module attendance counts, for screens that need the verdict but not the
-- classes behind it.
--
-- Home used to download every class of the term and every mark ever made,
-- only to reduce them to "one module is below its threshold". This returns the
-- same four numbers countSessions() produces in src/lib/attendance/stats.ts,
-- and mirrors it rule for rule:
--
--   * the college's figure, when there is one, is the opening balance, and
--     classes on or before the end of its day (UTC) are skipped entirely
--   * present and late count as attended, absent as missed
--   * excused is left out of both
--   * a past class with no mark, or marked unknown, is unmarked
--   * anything still to start is remaining
--
-- security invoker, so the caller's own row-level security decides what it
-- can see: it only ever counts the signed-in student's own modules.
create or replace function public.attendance_summary()
returns table (
  module_id  uuid,
  attended   integer,
  missed     integer,
  unmarked   integer,
  remaining  integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with m as (
    select
      id,
      -- Only a complete figure counts, exactly as officialOf() requires.
      case
        when official_attended is not null
         and official_held is not null
         and official_as_of is not null
        then true else false
      end as has_official,
      official_attended,
      official_held,
      (official_as_of + time '23:59:59') at time zone 'UTC' as cutoff
    from public.modules
  ),
  counted as (
    select
      s.module_id,
      s.starts_at,
      r.status,
      s.starts_at <= now() as is_past
    from public.class_sessions s
    left join public.attendance_records r on r.session_id = s.id
  )
  select
    m.id as module_id,
    (case when m.has_official then m.official_attended else 0 end
      + count(*) filter (
          where c.is_past
            and (not m.has_official or c.starts_at > m.cutoff)
            and c.status in ('present', 'late')))::integer as attended,
    (case when m.has_official then m.official_held - m.official_attended else 0 end
      + count(*) filter (
          where c.is_past
            and (not m.has_official or c.starts_at > m.cutoff)
            and c.status = 'absent'))::integer as missed,
    (count(*) filter (
          where c.is_past
            and (not m.has_official or c.starts_at > m.cutoff)
            and (c.status is null or c.status = 'unknown')))::integer as unmarked,
    (count(*) filter (where c.module_id is not null and not c.is_past))::integer as remaining
  from m
  left join counted c on c.module_id = m.id
  group by m.id, m.has_official, m.official_attended, m.official_held;
$$;

revoke all on function public.attendance_summary() from public, anon;
grant execute on function public.attendance_summary() to authenticated;
