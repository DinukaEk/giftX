import { CATEGORIES } from "@/lib/constants";
import type { ListingWithStore } from "@/lib/types";

/** Strip punctuation so "sister's" matches "sister", "gift-card" matches "gift card", etc. */
export function normalizeSearchText(text: string | null | undefined): string {
  return (text || "")
    .toLowerCase()
    .replace(/['’,.!?-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchTokens(query: string): string[] {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

/** How many search tokens matched this listing. Name hits count double. */
export function matchScore(listing: ListingWithStore, tokens: string[]): number {
  const nameHay = normalizeSearchText(listing.name);
  const restHay = normalizeSearchText(
    [
      listing.description,
      listing.search_keywords,
      CATEGORIES[listing.category],
      listing.stores?.store_name,
    ].join(" ")
  );

  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (nameHay.includes(t)) score += 2;
    if (restHay.includes(t)) score += 1;
  }
  return score;
}

export const OCCASION_CHIPS = [
  "Birthday",
  "Anniversary",
  "Graduation",
  "New baby",
  "Corporate",
  "Just because",
];