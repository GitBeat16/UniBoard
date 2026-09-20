import { BlobBackground } from "@/components/ui/blob-background";
import { SignInView } from "@/components/screens/sign-in-view";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <BlobBackground variant="calm" />
      <SignInView initialError={error} />
    </main>
  );
}
