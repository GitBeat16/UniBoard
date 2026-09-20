"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { ok: boolean; message: string } | null;

const credentials = z.object({
  email: z.email("That does not look like an email address."),
  // Supabase enforces its own policy; this is the floor, checked before we
  // bother the network.
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

async function origin() {
  const host = (await headers()).get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Supabase returns deliberately vague auth errors. Translating them is worth
 * the effort: "Email not confirmed" is a dead end unless we say what to do.
 */
function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password do not match an account.";
  }
  if (m.includes("email not confirmed")) {
    return "This account still needs confirming. Check your inbox, or use the magic link.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "There is already an account with that email. Try signing in instead.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts for now. Password sign-in is not rate limited — try that.";
  }
  if (m.includes("anonymous")) {
    return "Guest access is switched off for this project. Enable “Anonymous sign-ins” in Supabase → Authentication → Sign In / Providers.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "New sign-ups are switched off for this project.";
  }
  return message;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { ok: false, message: readable(error.message) };

  // redirect() works by throwing, so it must sit outside any try/catch.
  redirect("/");
}

export async function createAccount(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const displayName = String(formData.get("displayName") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  if (error) return { ok: false, message: readable(error.message) };

  // With email confirmation switched on, signUp returns a user but no session.
  // Saying so beats dropping them back on the form with no explanation.
  if (!data.session) {
    return {
      ok: true,
      message: "Account created. Check your email to confirm it, then sign in.",
    };
  }

  redirect("/");
}

export async function sendMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });

  if (error) return { ok: false, message: readable(error.message) };

  return { ok: true, message: `Link sent to ${email}. It expires in an hour.` };
}

/**
 * Guest mode is a real Supabase anonymous user, not a bypass: it has a genuine
 * session, so every RLS policy applies unchanged and nothing about the security
 * model bends to accommodate it. The account can be upgraded later from Me,
 * keeping whatever the student has already entered.
 */
export async function continueAsGuest(
  _prev: AuthState,
  _formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously();

  if (error) return { ok: false, message: readable(error.message) };

  redirect("/");
}
