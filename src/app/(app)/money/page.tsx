import { Suspense } from "react";
import { MoneyView, type BudgetRow, type ExpenseRow } from "@/components/screens/money-view";
import { NearbyPlaces, PlacesSkeleton } from "@/components/money/nearby-places";
import { CATEGORIES, type Category } from "@/lib/money/budget";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

// Enough to cover this month plus the tail of last week that crosses into it.
const LOOKBACK_DAYS = 40;

/** Outside the component: a server page reads the clock once per request. */
function lookbackStart() {
  return new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
}

export default async function MoneyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = lookbackStart();

  const [{ data: profile }, { data: budgets }, expenses] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency, campus_lat, campus_lng, campus_label")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("budget_periods")
      .select("kind, total_budget, food_budget, starts_at")
      .order("starts_at", { ascending: false })
      .limit(24),
    fetchAll((from, to) =>
      supabase
        .from("expenses")
        .select("id, amount, category, note, spent_at")
        .gte("spent_at", since)
        .order("spent_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
  ]);

  const budgetRows: BudgetRow[] = (budgets ?? [])
    .filter((b) => b.total_budget !== null)
    .map((b) => ({
      kind: b.kind,
      total: Number(b.total_budget),
      food: b.food_budget === null ? null : Number(b.food_budget),
      startsOn: b.starts_at,
    }));

  const expenseRows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    amount: Number(e.amount),
    category: (CATEGORIES as readonly string[]).includes(e.category)
      ? (e.category as Category)
      : "other",
    note: e.note,
    spentAt: e.spent_at,
  }));

  const campus =
    profile?.campus_lat != null && profile?.campus_lng != null
      ? { lat: profile.campus_lat, lng: profile.campus_lng, label: profile.campus_label }
      : null;

  return (
    <MoneyView
      currency={profile?.currency ?? "INR"}
      budgets={budgetRows}
      expenses={expenseRows}
      campus={campus}
      places={
        campus ? (
          // Streams in after the rest of the screen: the map service can take
          // a few seconds, and the budget should not wait for it.
          <Suspense fallback={<PlacesSkeleton />}>
            <NearbyPlaces origin={campus} />
          </Suspense>
        ) : null
      }
    />
  );
}
