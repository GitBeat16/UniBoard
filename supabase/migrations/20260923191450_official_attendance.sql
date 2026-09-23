-- The college's own attendance figure for a module.
--
-- The app counts attendance from the classes it knows about, which starts the
-- day the timetable is imported. A college has been counting since the term
-- began, and its number is the one that decides whether a student sits the
-- exam. So its count is stored as a baseline with the date it was taken, and
-- everything marked after that date is added to it.
alter table modules
  add column official_attended  integer,
  add column official_held      integer,
  add column official_as_of     date,
  add column official_source    text;

alter table modules
  add constraint modules_official_counts_sane check (
    (official_attended is null and official_held is null)
    or (official_attended >= 0 and official_held >= official_attended)
  );

comment on column modules.official_attended is
  'Classes attended, as the college counted them on official_as_of.';
comment on column modules.official_held is
  'Classes held, as the college counted them on official_as_of.';
comment on column modules.official_as_of is
  'The day the college''s figure was taken. Marks after it are added to it.';
comment on column modules.official_source is
  'How the figure arrived: photo, link or hand.';
