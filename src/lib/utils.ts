import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts (later classes win).
 * Used by every component so styling stays token-driven and composable.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
