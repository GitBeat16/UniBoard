"use client";

import { motion } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";
import type { Tone } from "@/lib/tones";

/**
 * Empty-state illustrations, in the same pen as the icon set: 2.2px ink with
 * a wobble, a soft tone blob behind, one flat tone accent, faded hatching.
 *
 * The ink draws itself in once, so an empty screen feels like it is being
 * sketched for you rather than showing a hole. Motion respects the OS setting
 * through the app-wide MotionConfig.
 *
 * Fill keys: TONE / SOFT come from the `tone` prop; PAPER and FELT are fixed.
 */
type Fill = "TONE" | "SOFT" | "PAPER" | "FELT";
type Drawing = {
  blob: string;
  fills: Array<[Fill, string]>;
  ink: string[];
  hatch: string[];
};

const DRAWINGS = {
  timetable: {
    blob: "M38 92C30 58 62 30 102 32C146 34 176 56 170 94C164 128 128 140 94 136C62 132 44 118 38 92Z",
    fills: [
      ["TONE", "M60 50C85 49 111 49 136 50C137 55 137 60 136 64C111 65 85 65 60 64C59 60 59 55 60 50Z"],
    ],
    ink: [
      "M62 46C86 44.5 111 44.8 136 46C138.5 70 138.6 95 137 120C111 122 86 121.6 61 120.4C59 96 59.5 71 61.4 47.5",
      "M60 64C86 63 111 63.2 137 64.4",
      "M76 38C76.4 42 76.2 46 76.5 51",
      "M121 38C121.3 42 121 46 121.4 51",
      "M74 80h.01",
      "M90 80h.01",
      "M106 80h.01",
      "M122 80h.01",
      "M74 96h.01",
      "M90 96h.01",
      "M106 96h.01",
      "M146 118C153 104 160 90 167 76C170 77.4 172.6 78.8 175 80.2C168 94.4 161 108.4 154 122.6C151 123.8 148.6 124.6 146 125C145.8 122.8 145.8 120.4 146 118",
      "M164 82C166.8 83.3 169.4 84.7 172 86.1",
      "M146.6 118.6C149 119.8 151.4 121 153.6 122.2",
    ],
    hatch: [
      "M122 116 131 104",
      "M112 116 121 104",
      "M102 116 111 104",
    ],
  },
  board: {
    blob: "M34 86C28 52 64 26 104 30C150 34 178 60 168 98C158 132 118 142 86 136C56 130 40 114 34 86Z",
    fills: [
      ["FELT", "M52 40C82 38.6 112 38.8 142 40C143.6 64 143.4 88 142 112C112 113.4 82 113.2 52 112C50.6 88 50.8 64 52 40Z"],
      ["PAPER", "M112 96C124 92 136 88.6 148 85C151.6 96 154.8 107 157.4 118C145.6 121.6 133.6 125 121.6 128.6C118.4 117.8 115.2 107 112 96.8Z"],
      ["TONE", "M92 55.8C95.4 55.8 98 58.4 98 61.6C98 64.8 95.4 67.4 92 67.4C88.8 67.4 86.2 64.8 86.2 61.6C86.2 58.4 88.8 55.8 92 55.8Z"],
      ["PAPER", "M90 58.6C91 58.4 91.8 59 91.8 59.8C91.8 60.6 91 61.2 90.2 61C89.4 60.8 89 60 89.4 59.2Z"],
    ],
    ink: [
      "M50 38C82 36.4 113 36.8 144 38C145.8 63 145.6 88 144 113C113 114.8 82 114.6 50.8 113.2C49 88 49.2 63 50.4 39",
      "M112 96C124 92 136 88.6 148 85C151.6 96 154.8 107 157.4 118C145.6 121.6 133.6 125 121.6 128.6C118.4 117.8 115.2 107 112 96.8",
      "M121 104C128 102 135 100 142 97.8",
      "M123.4 112C129.4 110.2 135.4 108.4 141.4 106.6",
      "M92.6 55.6C95.8 55.8 98.2 58.4 98 61.6C97.8 64.8 95.2 67.4 92 67.4C88.8 67.4 86.2 64.8 86.2 61.6C86.2 58.4 88.8 55.8 92 55.6",
      "M91.6 67.4C91.4 69.6 91.2 71.6 91 73.6",
    ],
    hatch: [
      "M130 124 138 116",
      "M138 122 146 114",
    ],
  },
  money: {
    blob: "M36 90C30 58 60 32 100 32C144 32 174 58 168 94C162 128 124 140 92 136C60 132 42 118 36 90Z",
    fills: [
      ["TONE", "M60 70C84 69 110 69 134 70C135 86 135 102 134 118C110 119 84 119 60 118C59 102 59 86 60 70Z"],
    ],
    ink: [
      "M58 68C84 66.6 112 66.8 138 68C139.6 85 139.4 102 138 119C112 120.6 84 120.4 58.6 119.2C57 102 57.2 85 58.4 69.2",
      "M59 68C76 60 93 53 110 47.6C112 54 113.6 60.6 114.6 67.4",
      "M138 84C130 83.4 122.6 83.6 115.8 84.4C115.2 89 115.2 93.6 115.8 98C123 98.8 130.6 98.8 138 98.2",
      "M126.6 91.2h.01",
      "M150 34C155 34 158.6 38 158.4 42.8C158.2 47.6 154.2 51.2 149.6 51C144.8 50.8 141.4 46.8 141.6 42.2C141.8 37.6 145.6 34 150.2 34",
      "M150 38.6C150.1 41.4 150 44.2 150.1 47",
      "M162 26 166 22",
      "M165 34 170 33",
      "M138 26 135 21",
    ],
    hatch: [
      "M64 114 74 102",
      "M72 114 82 102",
      "M80 114 90 102",
    ],
  },
  places: {
    blob: "M34 88C28 56 60 30 100 30C146 30 176 56 170 92C164 128 126 140 92 136C58 132 40 116 34 88Z",
    fills: [
      ["SOFT", "M56 44 88 36 120 46 150 38 150 112 120 120 88 110 56 118Z"],
    ],
    ink: [
      "M56 44C66.6 41.2 77.2 38.6 88 36C98.6 39.4 109.4 42.8 120 46C130 43.4 140 40.6 150.2 38C150.6 62.6 150.4 87.4 150 112C140 114.8 130 117.4 120 120C109.4 116.6 98.6 113.4 88 110C77.4 112.6 66.8 115.4 56.2 118C55.6 93.4 55.6 68.6 56 45",
      "M88 37C88.4 61 88.2 86 88 109.6",
      "M120 46.6C120.4 71 120.2 95.6 120 119.4",
      "M66 104C70 98 74 94 80 92",
      "M86 90C92 88 98 84 102 78",
      "M106 72C110 68 116 66 122 66",
      "M130 78C124.6 71.8 119 64 119 57C119 50.2 124.2 45 130.4 45C136.6 45 141.6 50.4 141.4 57C141.2 64 135.6 71.6 129.6 77.6",
      "M130.6 53C133 53 134.6 55 134.4 57.2C134.2 59.4 132.4 61 130.2 61C128 61 126.4 59.2 126.4 57C126.6 54.8 128.4 53 130.6 53",
    ],
    hatch: [
      "M60 112 68 102",
      "M60 100 68 90",
      "M124 110 132 100",
      "M136 108 144 98",
    ],
  },
} satisfies Record<string, Drawing>;

export type IllustrationName = keyof typeof DRAWINGS;

export function Illustration({
  name,
  tone = "sky",
  className,
  title,
}: {
  name: IllustrationName;
  tone?: Tone;
  className?: string;
  /** Describe it when it carries meaning; omit when the text beside it says it all. */
  title?: string;
}) {
  const d: Drawing = DRAWINGS[name];
  const color = (f: Fill) =>
    f === "TONE"
      ? `var(--color-${tone})`
      : f === "SOFT"
        ? `var(--color-${tone}-soft)`
        : f === "FELT"
          ? "var(--color-felt)"
          : "var(--color-paper)";

  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      stroke="var(--color-ink)"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <motion.path
        d={d.blob}
        fill={`var(--color-${tone}-soft)`}
        stroke="none"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_SOFT }}
        style={{ originX: "50%", originY: "50%" }}
      />
      {d.fills.map(([f, p], i) => (
        <motion.path
          key={i}
          d={p}
          fill={color(f)}
          stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25, ease: EASE_SOFT }}
        />
      ))}
      <g strokeWidth={2.2}>
        {d.ink.map((p, i) => (
          <motion.path
            key={i}
            d={p}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: EASE_SOFT }}
          />
        ))}
      </g>
      <motion.g
        strokeWidth={1.2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        {d.hatch.map((p, i) => (
          <path key={i} d={p} />
        ))}
      </motion.g>
    </svg>
  );
}
