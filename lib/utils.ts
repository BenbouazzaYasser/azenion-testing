import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class lists safely, resolving conflicting utility classes
 * (e.g. "px-2" vs "px-4") in favor of the last one applied.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
