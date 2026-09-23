import { notFound } from "next/navigation";
import { Tour } from "@/components/landing/tour";

/**
 * The stage the landing-page video is recorded from: the real screens, with
 * sample data, playing in order. Dev only — it is how the asset in
 * public/media is made, not something a student ever sees.
 *
 * Record with the script in tools/record-tour.mjs.
 */
export const dynamic = "force-dynamic";

export default function TourPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Tour />;
}
