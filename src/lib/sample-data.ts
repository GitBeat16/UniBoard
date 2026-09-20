import type { ModuleAttendance } from "@/lib/attendance/stats";
import type { AdvisorPayload } from "@/components/advisor/advisor-view";
import type { GoalVM, ProfileVM } from "@/components/screens/me-view";
import type { WorkItem } from "@/lib/work/urgency";
import type { SessionVM } from "@/lib/view-models";

/**
 * Fixtures for the /preview gallery only. Never imported by the app itself —
 * the real screens read Supabase. Dates are relative to now so the gallery
 * always shows a plausible week.
 */

function at(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const sampleSessions: SessionVM[] = [
  {
    id: "s1",
    moduleId: "m1",
    moduleName: "Databases",
    code: "CS2004",
    tone: "sky",
    type: "lecture",
    startsAt: at(0, 9),
    endsAt: at(0, 10, 50),
    room: "Bragg 1.05",
    isAssessed: false,
    hasSubmission: false,
    status: "present",
  },
  {
    id: "s2",
    moduleId: "m2",
    moduleName: "Machine Learning",
    code: "COMP30120",
    tone: "coral",
    type: "lab",
    startsAt: at(0, 14),
    endsAt: at(0, 16),
    room: "Computer Lab 2.14",
    isAssessed: true,
    hasSubmission: true,
    status: null,
  },
  {
    id: "s3",
    moduleId: "m3",
    moduleName: "Operating Systems",
    code: null,
    tone: "leaf",
    type: "tutorial",
    startsAt: at(0, 17),
    endsAt: at(0, 18),
    room: "Roberts 4.11",
    isAssessed: false,
    hasSubmission: false,
    status: null,
  },
  {
    id: "s4",
    moduleId: "m1",
    moduleName: "Databases",
    code: "CS2004",
    tone: "sky",
    type: "lab",
    startsAt: at(1, 11),
    endsAt: at(1, 13),
    room: "Bragg 0.12",
    isAssessed: false,
    hasSubmission: false,
    status: null,
  },
];

export const sampleStats: ModuleAttendance[] = [
  {
    moduleId: "m2",
    name: "Machine Learning",
    code: "COMP30120",
    colorToken: "coral",
    threshold: 75,
    attended: 5,
    missed: 3,
    held: 8,
    unmarked: 1,
    remaining: 6,
    percent: 62.5,
    canMissMore: 0,
    status: "below",
  },
  {
    moduleId: "m1",
    name: "Databases",
    code: "CS2004",
    colorToken: "sky",
    threshold: 75,
    attended: 9,
    missed: 2,
    held: 11,
    unmarked: 0,
    remaining: 5,
    percent: 81.8,
    canMissMore: 2,
    status: "thin",
  },
  {
    moduleId: "m3",
    name: "Operating Systems",
    code: null,
    colorToken: "leaf",
    threshold: 75,
    attended: 12,
    missed: 1,
    held: 13,
    unmarked: 0,
    remaining: 7,
    percent: 92.3,
    canMissMore: 5,
    status: "safe",
  },
];

export const sampleNextSession = sampleSessions[1];

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}


function daysFromNow(d: number, hour = 17) {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(hour, 0, 0, 0);
  return x.toISOString();
}

export const sampleWork: WorkItem[] = [
  {
    id: "w1",
    kind: "assignment",
    title: "ML coursework 2",
    at: daysFromNow(0, 23),
    moduleId: "m2",
    moduleName: "Machine Learning",
    tone: "coral",
    status: "in_progress",
    weight: 30,
    estimatedHours: 8,
  },
  {
    id: "w2",
    kind: "assignment",
    title: "Databases lab report",
    at: daysFromNow(2),
    moduleId: "m1",
    moduleName: "Databases",
    tone: "sky",
    status: "not_started",
    weight: 15,
    estimatedHours: 4,
  },
  {
    id: "w3",
    kind: "exam",
    title: "Operating Systems midterm",
    at: daysFromNow(6, 9),
    moduleId: "m3",
    moduleName: "Operating Systems",
    tone: "leaf",
    status: null,
    weight: null,
    estimatedHours: null,
  },
  {
    id: "w4",
    kind: "assignment",
    title: "Reading response 3",
    at: daysFromNow(-2),
    moduleId: "m1",
    moduleName: "Databases",
    tone: "sky",
    status: "submitted",
    weight: 5,
    estimatedHours: 2,
  },
];

export const sampleModules = [
  { id: "m1", name: "Databases" },
  { id: "m2", name: "Machine Learning" },
  { id: "m3", name: "Operating Systems" },
];

export const sampleProfile: ProfileVM = {
  displayName: "Srushti",
  universityName: "University of Leeds",
  threshold: 75,
  attendanceMonitored: false,
  travelMinutes: 35,
};

export const sampleGoals: GoalVM[] = [
  { id: "g1", title: "Finish the React course", kind: "project", targetPerWeek: null, progress: 60 },
  { id: "g2", title: "Gym", kind: "habit", targetPerWeek: 3, progress: 30 },
];

/** A genuinely balanced case, so the gallery shows the gauge off-centre. */
export const sampleAdvisorPayload: AdvisorPayload = {
  session: { ...sampleSessions[3], isRecorded: true },
  attendance: sampleStats[1],
  deadlines: [
    { title: "ML coursework 2", dueAt: hoursFromNow(20), moduleId: "m2" },
  ],
  exams: [],
  travelMinutes: 45,
  attendanceMonitored: false,
  nowIso: new Date().toISOString(),
  work: sampleWork,
  goals: sampleGoals.map((g) => ({ id: g.id, title: g.title, kind: g.kind })),
};
