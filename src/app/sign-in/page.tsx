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
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12 lg:px-10">
      <BlobBackground variant="calm" />
      {/* The card alone on phones and tablets; beside an introduction on a laptop. */}
      <div className="flex w-full max-w-6xl items-center justify-center gap-16 xl:gap-24">
        <SignInHero className="hidden lg:block" />
        <SignInView initialError={error} />
      </div>
    </main>
  );
}
