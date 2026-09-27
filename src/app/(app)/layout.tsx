import { BlobBackground } from "@/components/ui/blob-background";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SideNav } from "@/components/ui/side-nav";
import { FirstOpenSplash } from "@/components/flora/first-open-splash";
import { BEFORE_PAINT } from "@/lib/flora/splash";

/**
 * One shell, three shapes:
 *  - phone: a single column and the floating bottom bar
 *  - tablet: the same bar, a wider column
 *  - laptop (lg+): a sidebar, and content up to ~1150px
 *
 * The screens themselves never look at the window size. <main> is a CSS
 * container and each screen arranges itself by the space it is given (@2xl:
 * etc.), so the same component lays out correctly in the app, beside the
 * sidebar, and inside the /preview gallery's phone frames.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh lg:pl-60">
      <script dangerouslySetInnerHTML={{ __html: BEFORE_PAINT }} />
      <FirstOpenSplash />
      <BlobBackground />
      <SideNav />
      <main className="@container mx-auto w-full max-w-md px-5 pb-32 pt-10 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10 lg:pb-16 lg:pt-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
