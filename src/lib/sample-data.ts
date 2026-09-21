import type { ModuleAttendance } from "@/lib/attendance/stats";
import type { AdvisorPayload } from "@/components/advisor/advisor-view";
import type { GoalVM, ProfileVM } from "@/components/screens/me-view";
import type { WorkItem } from "@/lib/work/urgency";
import type { SessionVM } from "@/lib/view-models";
import type { Budget, Expense } from "@/lib/money/budget";
import type { Place } from "@/lib/places/overpass";

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

// ---------------------------------------------------------------- money

function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export const sampleBudgets: Budget[] = [
  { kind: "week", total: 1500, food: 800, startsOn: "2026-01-01" },
];

/** Recent enough to land in the current week on any day but a Monday morning. */
export const sampleExpenses: Expense[] = [
  { id: "x1", amount: 60, category: "food", note: "Vada pav + chai", spentAt: minutesAgo(40) },
  { id: "x2", amount: 30, category: "transport", note: "Bus pass top-up", spentAt: minutesAgo(180) },
  { id: "x3", amount: 140, category: "food", note: "Canteen thali", spentAt: minutesAgo(60 * 20) },
  { id: "x4", amount: 250, category: "study", note: "Lab manual printouts", spentAt: minutesAgo(60 * 26) },
  { id: "x5", amount: 199, category: "fun", note: null, spentAt: minutesAgo(60 * 30) },
];

export const sampleCampus = { lat: 18.4575, lng: 73.8508, label: "PICT main gate" };

export const samplePlaces: Place[] = [
  { id: "node/1", name: "College Canteen", lat: 18.4577, lng: 73.8509, kind: "food_court", cuisine: "Indian", veg: "yes", hours: "Mo-Sa 08:00-20:00", distanceM: 40, walkMin: 1 },
  { id: "node/2", name: "Chai Point", lat: 18.4582, lng: 73.8514, kind: "cafe", cuisine: "Tea, Snacks", veg: "only", hours: null, distanceM: 160, walkMin: 3 },
  { id: "node/3", name: "Sai Snacks Centre", lat: 18.4561, lng: 73.8521, kind: "fast_food", cuisine: "Indian", veg: null, hours: "Mo-Su 09:00-23:00", distanceM: 290, walkMin: 5 },
  { id: "way/4", name: "Hotel Shreyas", lat: 18.4548, lng: 73.8495, kind: "restaurant", cuisine: "Maharashtrian", veg: "only", hours: null, distanceM: 440, walkMin: 7 },
];
