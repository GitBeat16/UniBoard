import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BlobBackground } from "@/components/ui/blob-background";
import { SignInHero } from "@/components/screens/sign-in-hero";
import { SignInView } from "@/components/screens/sign-in-view";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 pb-12 pt-24 lg:px-10">
      <BlobBackground variant="calm" />
      <Link
        href="/welcome"
        aria-label="UniBoard — what it is"
        className="absolute left-5 top-6 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink md:left-8 lg:left-10"
      >
        <Logo size={36} />
      </Link>
      {/* The card alone on phones and tablets; beside an introduction on a laptop. */}
      <div className="flex w-full max-w-6xl items-center justify-center gap-16 xl:gap-24">
        <SignInHero className="hidden lg:block" />
        <SignInView initialError={error} />
      </div>
    </main>
  );
}
