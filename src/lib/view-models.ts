import type { Enums } from "@/lib/supabase/database.types";
import type { Tone } from "@/lib/tones";

/** Serializable shape handed from server components to the client screens. */
export type SessionVM = {
  id: string;
  moduleId: string;
  moduleName: string;
  code: string | null;
  tone: Tone;
  type: Enums<"session_type">;
  startsAt: string;
  endsAt: string;
  room: string | null;
  isAssessed: boolean;
  hasSubmission: boolean;
  status: Enums<"attendance_status"> | null;
};

export const SESSION_TYPE_LABEL: Record<Enums<"session_type">, string> = {
  lecture: "Lecture",
  lab: "Lab",
  seminar: "Seminar",
  tutorial: "Tutorial",
  workshop: "Workshop",
  other: "Class",
};
