import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles every shape a Supabase auth link can arrive in.
 *
 *  - `token_hash` + `type`  → verifyOtp. No PKCE verifier needed, so this
 *    survives being opened in a different browser from the one that asked for
 *    the link. This is the robust shape; it requires the email template to use
 *    `{{ .TokenHash }}`.
 *  - `code`                 → exchangeCodeForSession. The default template's
 *    shape. The code is bound to a PKCE verifier cookie held by the browser
 *    that requested the link, which is the usual reason these fail.
 *  - `error` / `error_description` → Supabase rejected it before we saw it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next") ?? "/";

  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(message)}`);

  const supabaseError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (supabaseError) return fail(readable(supabaseError));

  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail(readable(error.message));
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail(readable(error.message));
  }

  return fail("That link was missing its sign-in token. Ask for a fresh one.");
}

function readable(message: string): string {
  const m = message.toLowerCase();

  // The classic PKCE failure: the verifier lives in the browser that asked for
  // the link, so opening it elsewhere (or after clearing cookies) cannot work.
  if (m.includes("code verifier") || m.includes("code challenge")) {
    return "Open the link in the same browser you requested it from — or just use a password below.";
  }
  if (m.includes("expired")) {
    return "That link has expired. Links last an hour.";
  }
  if (m.includes("already") || m.includes("used")) {
    return "That link was already used. Ask for a fresh one, or sign in with a password.";
  }
  if (m.includes("invalid") || m.includes("not found")) {
    return "That link is no longer valid. Ask for a fresh one, or sign in with a password.";
  }
  return `${message} — you can sign in with a password instead.`;
}
