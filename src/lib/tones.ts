export const TONES = ["sky", "coral", "sun", "leaf", "iris"] as const;
export type Tone = (typeof TONES)[number];

export function asTone(token: string | null | undefined): Tone {
  return (TONES as readonly string[]).includes(token ?? "") ? (token as Tone) : "sky";
}

// Tailwind needs literal class names, so these cannot be built by interpolation.
export const toneBg: Record<Tone, string> = {
  sky: "bg-sky",
  coral: "bg-coral",
  sun: "bg-sun",
  leaf: "bg-leaf",
  iris: "bg-iris",
};

export const toneText: Record<Tone, string> = {
  sky: "text-sky",
  coral: "text-coral",
  sun: "text-sun",
  leaf: "text-leaf",
  iris: "text-iris",
};

export const toneSoft: Record<Tone, string> = {
  sky: "bg-sky-soft",
  coral: "bg-coral-soft",
  sun: "bg-sun-soft",
  leaf: "bg-leaf-soft",
  iris: "bg-iris-soft",
};

export const toneVar: Record<Tone, string> = {
  sky: "var(--color-sky)",
  coral: "var(--color-coral)",
  sun: "var(--color-sun)",
  leaf: "var(--color-leaf)",
  iris: "var(--color-iris)",
};
