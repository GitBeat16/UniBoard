-- Inputs the Skip Advisor's guardrails need.
alter table profiles
  add column attendance_monitored boolean not null default false,
  add column travel_minutes smallint;
