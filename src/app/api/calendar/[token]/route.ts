import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildIcs, type FeedEvent } from "@/lib/calendar/ics-feed";
import type { Database } from "@/lib/supabase/database.types";

/**
 * The subscribable calendar feed.
 *
 * Google Calendar fetches this anonymously on its own schedule, so there is no
 * session to read — the token in the path is the credential, checked inside a
 * security-definer function that returns zero rows for an unknown token.
 *
 * Deliberately not cached at the edge: a stale timetable is worse than a slow
 * one, and calendar clients poll on the order of hours anyway.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // A malformed token is a 404 like any other, so this cannot be used to tell
  // "wrong shape" from "no such feed".
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("calendar_feed", { p_token: token });

  if (error) {
    return new NextResponse("Could not build the feed", { status: 500 });
  }

  const events: FeedEvent[] = (data ?? []).map((row) => ({
    uid: row.uid,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    description: row.description,
  }));

  const body = buildIcs(events, { name: "UniBoard", stamp: new Date() });

  return new NextResponse(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="uniboard.ics"',
      "cache-control": "no-store",
    },
  });
}
