import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about our custom scale.
 *
 * Out of the box it only knows Tailwind's default font sizes (text-xs … text-9xl),
 * so it guesses that `text-body` is a COLOUR and treats it as conflicting with
 * `text-paper` — silently dropping whichever came first. That is how the primary
 * button ended up with black text on a black pill.
 *
 * Registering the size tokens explicitly makes exact-match win over the
 * colour validator.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "body", "label", "caption"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
