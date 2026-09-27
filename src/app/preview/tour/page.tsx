import { notFound } from "next/navigation";
import { TourStill } from "@/components/landing/tour";
import { isTourScene } from "@/lib/tour";

/**
 * The stage the landing page's tour stills are captured from: one real
 * screen, with sample data, at /preview/tour?scene=<id>. Dev only — it is how
 * the images in public/media/tour are made, not something a student sees.
 *
 * Capture them all with tools/capture-tour.mjs.
 */
export const dynamic = "force-dynamic";

export default async function TourPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { scene } = await searchParams;
  if (!isTourScene(scene)) notFound();
  return <TourStill scene={scene} />;
}
