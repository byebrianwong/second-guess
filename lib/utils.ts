import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * Tie-aware ranks for an array of items already sorted by score desc.
 * Items tied on score share a rank; the next distinct score skips ahead.
 *   scores [10, 10, 7, 5] -> ranks [1, 1, 3, 4]
 */
export function tieRanks<T>(items: T[], score: (t: T) => number): number[] {
  const ranks: number[] = [];
  let prev: number | null = null;
  let currentRank = 0;
  items.forEach((item, i) => {
    const s = score(item);
    if (prev === null || s !== prev) {
      currentRank = i + 1;
      prev = s;
    }
    ranks.push(currentRank);
  });
  return ranks;
}
