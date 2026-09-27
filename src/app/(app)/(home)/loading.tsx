import { FloraLoader } from "@/components/flora/flora-loader";
import { HomeSkeleton } from "@/components/screens/home-skeleton";

/**
 * Shown the moment Home is asked for, while its queries run.
 *
 * The skeleton appears at once and is shaped like the real page, so nothing
 * jumps when it lands. Flora only joins it if the wait passes 400 ms.
 *
 * It lives in the (home) route group so it only ever stands in for Home: a
 * loading.tsx one level up would wrap Timetable, Board and Money too, and
 * show them a Home-shaped skeleton.
 */
export default function Loading() {
  return (
    <>
      <HomeSkeleton />
      <FloraLoader screen="home" variant="overlay" />
    </>
  );
}
