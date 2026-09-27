import { HomeSkeleton } from "@/components/screens/home-skeleton";

/**
 * Shown the moment Home is asked for, while its queries run.
 *
 * It lives in the (home) route group so it only ever stands in for Home: a
 * loading.tsx one level up would wrap Timetable, Board and Money too, and
 * show them a Home-shaped skeleton.
 */
export default function Loading() {
  return <HomeSkeleton />;
}
