/**
 * The scenes of the landing-page tour video, in order.
 *
 * One list, read by two places: /preview/tour plays these scenes so the
 * video can be recorded from the real components, and the landing page
 * builds its chapter list from the same durations — so the chapters always
 * line up with the recording. Change a duration here, re-record, done.
 */
export const TOUR_SCENES = [
  {
    id: "import",
    title: "Timetable in",
    text: "Paste a calendar link, upload the file, or snap the grid on the notice board.",
    seconds: 4.5,
  },
  {
    id: "attendance",
    title: "Attendance that adds up",
    text: "Every module's rate, and how many more you can miss before the line.",
    seconds: 4.5,
  },
  {
    id: "advisor",
    title: "Go or skip?",
    text: "An honest call with its reasons. Some classes it will never let you skip.",
    seconds: 5,
  },
  {
    id: "board",
    title: "Your soft board",
    text: "Hand-ins, exams and campus events, pinned in the order they matter.",
    seconds: 5,
  },
  {
    id: "money",
    title: "Money and food",
    text: "What today can take, and cafés ranked by the walk from class.",
    seconds: 5,
  },
] as const;

export type TourSceneId = (typeof TOUR_SCENES)[number]["id"];

export const TOUR_SECONDS = TOUR_SCENES.reduce((n, s) => n + s.seconds, 0);

/**
 * Where each scene actually starts in public/media/uniboard-tour.*, and how
 * long one loop of it runs.
 *
 * MEASURED FROM THE FILE, not computed from the durations above: a screen
 * rendering for the first time costs real seconds, so the recording runs
 * longer than the script. The landing page's chapters have to match the video
 * a student is watching, so they come from here. After re-recording, run
 * `node tools/measure-tour.mjs` and paste its numbers in.
 */
export const TOUR_VIDEO = {
  seconds: 27.5,
  chapterAt: [0, 6, 10.6, 18.7, 22.5],
} as const;

/** Chapter marks for the landing page, in the order the video plays them. */
export function tourChapters() {
  return TOUR_SCENES.map((s, i) => ({
    at: TOUR_VIDEO.chapterAt[i] ?? 0,
    title: s.title,
    text: s.text,
  }));
}

/** Scene boundaries while the tour PLAYS (the /preview/tour page). */
export function tourScriptChapters() {
  let at = 0;
  return TOUR_SCENES.map((s) => {
    const chapter = { at, title: s.title, text: s.text };
    at += s.seconds;
    return chapter;
  });
}
