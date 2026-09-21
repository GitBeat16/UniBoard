-- Inputs the Skip Advisor's guardrails need.
-- attendance_monitored covers visa sponsorship, professional-body requirements
-- and existing academic warnings: cases where a missed class costs far more
-- than the grade, so the advisor must force GO and say why.
alter table profiles
  add column attendance_monitored boolean not null default false,
  add column travel_minutes smallint;

comment on column profiles.attendance_monitored is
  'Attendance formally monitored (visa/professional body/warning). Forces a GO verdict.';
comment on column profiles.travel_minutes is
  'One-way door-to-door commute in minutes, used to weigh travel cost against class length.';
