-- Money (v0.3): currency, a campus pin for "food near me", and tighter
-- budget/expense rows.

-- Currency is the student's, not the budget's: one person budgets in one
-- currency, and every amount on screen is formatted with it. INR by default;
-- nothing else in the app assumes a country.
alter table profiles
  add column currency     text not null default 'INR'
    constraint profiles_currency_iso check (currency ~ '^[A-Z]{3}$'),
  add column campus_lat   double precision
    constraint profiles_campus_lat_range check (campus_lat between -90 and 90),
  add column campus_lng   double precision
    constraint profiles_campus_lng_range check (campus_lng between -180 and 180),
  add column campus_label text
    constraint profiles_campus_label_len check (char_length(campus_label) <= 80),
  -- Both or neither: half a coordinate is not a place.
  add constraint profiles_campus_pair check ((campus_lat is null) = (campus_lng is null));

comment on column profiles.campus_lat is
  'Where "food near me" is measured from. Set once by the student; never tracked.';

alter table budget_periods
  alter column currency set default 'INR',
  add constraint budget_periods_currency_iso check (currency ~ '^[A-Z]{3}$'),
  add constraint budget_periods_amounts check (
    (total_budget is null or total_budget > 0) and
    (food_budget  is null or food_budget  >= 0) and
    (total_budget is null or food_budget is null or food_budget <= total_budget)
  );

-- One budget takes effect per day; setting it again the same day replaces it.
create unique index budget_periods_user_day_idx on budget_periods(user_id, starts_at);

alter table expenses
  add constraint expenses_amount_positive check (amount > 0 and amount < 10000000),
  add constraint expenses_category_known check (
    category in ('food','transport','study','fun','other')
  ),
  add constraint expenses_note_len check (note is null or char_length(note) <= 120);
