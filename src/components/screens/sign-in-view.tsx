"use client";

import { useActionState, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { FloraSolo } from "@/components/flora/flora-says";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/cn";
import { EASE_SOFT, LAYOUT_SPRING } from "@/lib/motion";
import {
  continueAsGuest,
  createAccount,
  sendMagicLink,
  signIn,
  type AuthState,
} from "@/app/sign-in/actions";

const field =
  "h-13 w-full rounded-full bg-canvas px-6 text-body text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-ink";

type Mode = "signin" | "register" | "link";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "signin", label: "Sign in" },
  { id: "register", label: "Create account" },
];

export function SignInView({ initialError }: { initialError?: string }) {
  const [mode, setModeState] = useState<Mode>("signin");
  // The guest result belongs to its own form, so it should not linger under a
  // different one after the student switches tabs.
  const [showGuestResult, setShowGuestResult] = useState(false);
  const tabId = useId();

  function setMode(next: Mode) {
    setModeState(next);
    setShowGuestResult(false);
  }

  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(
    signIn,
    null,
  );
  const [registerState, registerAction, registering] = useActionState<AuthState, FormData>(
    createAccount,
    null,
  );
  const [linkState, linkAction, sendingLink] = useActionState<AuthState, FormData>(
    sendMagicLink,
    null,
  );
  const [guestState, guestAction, enteringAsGuest] = useActionState<AuthState, FormData>(
    continueAsGuest,
    null,
  );

  const state =
    mode === "signin" ? signInState : mode === "register" ? registerState : linkState;

  const notice = showGuestResult ? (guestState ?? state) : (state ?? asNotice(initialError));

  const busy = signingIn || registering || sendingLink || enteringAsGuest;

  return (
    <Card className="relative w-full max-w-sm p-8">
      {/* Flora leans over the top edge of the card — the overlap is what makes
          her feel part of the page rather than pasted onto it. */}
      <FloraSolo mood="cheer" size="md" action="wave" className="absolute -top-20 right-4" />

      <p className="text-caption font-semibold uppercase text-muted">UniBoard</p>
      <h1 className="mt-3 text-display">
        <span className="block font-normal">Your whole uni day,</span>
        <span className="block font-bold">on one board.</span>
      </h1>

      {mode !== "link" && (
        <div className="mt-7 flex gap-1 rounded-full bg-canvas p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={cn(
                "relative flex-1 rounded-full px-3 py-2 text-label font-semibold",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                mode === m.id ? "text-paper" : "text-muted hover:text-ink",
              )}
            >
              {mode === m.id && (
                <motion.span
                  layoutId={`${tabId}-auth-tab`}
                  transition={LAYOUT_SPRING}
                  className="absolute inset-0 rounded-full bg-ink"
                />
              )}
              <span className="relative">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: EASE_SOFT }}
          className="mt-5"
        >
          {mode === "signin" && (
            <form action={signInAction} className="flex flex-col gap-3">
              <Email />
              <Password autoComplete="current-password" />
              <PillButton type="submit" size="lg" className="w-full" disabled={busy}>
                {signingIn ? "Signing in…" : "Sign in"}
              </PillButton>
            </form>
          )}

          {mode === "register" && (
            <form action={registerAction} className="flex flex-col gap-3">
              <input
                name="displayName"
                autoComplete="given-name"
                placeholder="First name"
                className={field}
              />
              <Email />
              <Password autoComplete="new-password" hint="At least 8 characters" />
              <PillButton type="submit" size="lg" className="w-full" disabled={busy}>
                {registering ? "Creating…" : "Create account"}
              </PillButton>
            </form>
          )}

          {mode === "link" && (
            <form action={linkAction} className="flex flex-col gap-3">
              <p className="text-body text-muted">
                We&rsquo;ll email you a link — no password needed.
              </p>
              <Email />
              <PillButton type="submit" size="lg" className="w-full" disabled={busy}>
                {sendingLink ? "Sending…" : "Email me a link"}
              </PillButton>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.p
            key={notice.message}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE_SOFT }}
            role="status"
            className={cn("mt-4 text-label", notice.ok ? "text-leaf" : "text-coral")}
          >
            {notice.message}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-hairline" />
        <span className="text-caption uppercase text-muted">or</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === "link" ? "signin" : "link")}
          className="rounded-full py-2 text-label font-semibold text-ink underline underline-offset-4 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {mode === "link" ? "Use a password instead" : "Email me a magic link instead"}
        </button>

        {/* Guest mode is a real anonymous session, so nothing downstream has to
            special-case it — and the data survives if they sign up later. */}
        <form action={guestAction} onSubmit={() => setShowGuestResult(true)}>
          <PillButton
            type="submit"
            variant="outline"
            size="md"
            className="w-full"
            disabled={busy}
          >
            {enteringAsGuest ? "Setting up…" : "Have a look around first"}
          </PillButton>
        </form>
        <p className="text-caption text-muted">
          Starts an anonymous account you can keep. Add an email any time from
          your profile and everything comes with you.
        </p>
      </div>
    </Card>
  );
}

/** A redirect-carried error (e.g. a dead magic link) reads like any other notice. */
function asNotice(message?: string): AuthState {
  return message ? { ok: false, message } : null;
}

function Email() {
  return (
    <>
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@uni.ac.uk"
        className={field}
      />
    </>
  );
}

function Password({
  autoComplete,
  hint,
}: {
  autoComplete: "current-password" | "new-password";
  hint?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div>
      <label htmlFor="password" className="sr-only">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={shown ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          placeholder="Password"
          className={cn(field, "pr-20")}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-label font-semibold text-muted hover:text-ink"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {hint && <p className="mt-1.5 px-5 text-caption text-muted">{hint}</p>}
    </div>
  );
}
