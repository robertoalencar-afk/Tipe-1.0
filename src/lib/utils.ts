import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Ensina ao tailwind-merge os tokens próprios do design system TIPE
 * (src/styles.css). Sem isso, `text-headline` era tratado como cor e
 * descartado quando a mesma lista tinha `text-white` ou `text-foreground`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "headline", "title"],
      shadow: ["soft", "lift", "device", "glow"],
      tracking: ["display", "heading"],
      ease: ["out-soft"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
