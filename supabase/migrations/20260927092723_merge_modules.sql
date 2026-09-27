-- Fold one subject into another, all or nothing.
--
-- A photographed timetable is read well but not perfectly: "DM" on one day
-- and "D.M" on another come back as two subjects, each with half the classes.
-- Merging moves the classes (and so their attendance marks), the hand-ins and
-- the exams across, keeps the college's figure (the target's if it has one,
-- otherwise the source's), and then removes the empty source.
--
-- One function, so one transaction: done in several requests from the app, a
-- failure halfway would leave classes split across two subjects, or worse,
-- delete the source with classes still on it — the cascade would take them.
--
-- security invoker: row-level security decides what the caller can touch, so
-- neither id can belong to somebody else. It also checks explicitly, because
-- an update that RLS silently filters to zero rows would otherwise look like
-- success.
create or replace function public.merge_modules(p_from uuid, p_into uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  moved integer;
begin
  if p_from = p_into then
    raise exception 'A subject cannot be merged into itself';
  end if;

  if (select count(*) from public.modules where id in (p_from, p_into)) <> 2 then
    raise exception 'Both subjects must be yours';
  end if;

  update public.class_sessions set module_id = p_into where module_id = p_from;
  get diagnostics moved = row_count;

  update public.assignments set module_id = p_into where module_id = p_from;
  update public.exams set module_id = p_into where module_id = p_from;

  -- Keep a college figure if either side has one; the target's wins.
  update public.modules t
     set official_attended = s.official_attended,
         official_held     = s.official_held,
         official_as_of    = s.official_as_of,
         official_source   = s.official_source,
         code              = coalesce(t.code, s.code)
    from public.modules s
   where t.id = p_into
     and s.id = p_from
     and t.official_as_of is null
     and s.official_as_of is not null;

  update public.modules t
     set code = coalesce(t.code, s.code)
    from public.modules s
   where t.id = p_into and s.id = p_from;

  delete from public.modules where id = p_from;

  return moved;
end;
$$;

revoke all on function public.merge_modules(uuid, uuid) from public, anon;
grant execute on function public.merge_modules(uuid, uuid) to authenticated;
