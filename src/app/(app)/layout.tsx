import { BlobBackground } from "@/components/ui/blob-background";
import { BottomNav } from "@/components/ui/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <BlobBackground />
      {/* Phone-width column even on desktop: the reference is a mobile design,
          and stretching these cards across 1400px destroys it. */}
      <main className="mx-auto w-full max-w-md px-5 pb-32 pt-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
