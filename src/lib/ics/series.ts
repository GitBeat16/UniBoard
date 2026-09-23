import { createHash } from "node:crypto";

/**
 * Which classes belong to the same weekly slot.
 *
 * "Every Wednesday at 11" is one series, and editing or dropping it should
 * reach all of them. Imports already name each occurrence with a uid built
 * from the slot plus the week, so the slot is what is left when the week is
 * taken off: "vision:dm|lecture|d3|11:00-12:00:w4" and its twelve siblings all
 * belong to "vision:dm|lecture|d3|11:00-12:00".
 */
export function seriesKeyOf(uid: string): string {
  return uid
    // a photographed week: :w0, :w1 …
    .replace(/:w\d+$/, "")
    // an ICS occurrence: parent uid :: recurrence id
    .replace(/::.*$/, "");
}

const NAMESPACE = "uniboard.class-series";

/**
 * A stable id for a series.
 *
 * Derived from the key rather than generated, so re-importing the same
 * timetable lands on the same series instead of quietly splitting a slot in
 * two. Shaped as a v5 UUID because the column is a uuid.
 */
export function seriesIdFor(userId: string, key: string): string {
  const hex = createHash("sha1").update(`${NAMESPACE}:${userId}:${key}`).digest("hex");
  const variant = (0x80 | (Number.parseInt(hex[16], 16) & 0x3f)).toString(16).padStart(2, "0");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    variant + hex.slice(18, 20),
    hex.slice(20, 32),
  ].join("-");
}
