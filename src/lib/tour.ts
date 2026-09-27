/**
 * The screens of the landing-page tour, in order.
 *
 * One list, read by two places: /preview/tour?scene=<id> draws each screen
 * from the real components with sample data, so its still can be captured
 * (tools/capture-tour.mjs), and the landing page's circular gallery shows
 * those stills with the titles below. Add a scene here, capture, done.
 */
export const TOUR_SCENES = [
  {
    id: "import",
    title: "Timetable in",
    text: "Paste a calendar link, upload the file, or snap the grid on the notice board.",
  },
  {
    id: "attendance",
    title: "Attendance that adds up",
    text: "Every module's rate, and how many more you can miss before the line.",
  },
  {
    id: "advisor",
    title: "Go or skip?",
    text: "An honest call with its reasons. Some classes it will never let you skip.",
  },
  {
    id: "board",
    title: "Your soft board",
    text: "Hand-ins, exams and campus events, pinned in the order they matter.",
  },
  {
    id: "money",
    title: "Money and food",
    text: "What today can take, and cafés ranked by the walk from class.",
  },
] as const;

export type TourSceneId = (typeof TOUR_SCENES)[number]["id"];

/** The phone a still is drawn at, in CSS pixels. Captured at 2×. */
export const TOUR_STAGE = { width: 390, height: 700 } as const;

/** Where a scene's still lives in public/. */
export function tourStill(id: TourSceneId) {
  return `/media/tour/${id}.webp`;
}

export function isTourScene(id: string | undefined): id is TourSceneId {
  return TOUR_SCENES.some((s) => s.id === id);
}
