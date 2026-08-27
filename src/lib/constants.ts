export const CATEGORIES: Record<string, string> = {
  flowers: "Flowers",
  cakes: "Cakes & Desserts",
  sweets: "Chocolates & Sweets",
  cards: "Gift Cards",
  fancy: "Hampers & Fancy",
  packages: "Custom Packages",
  stationery: "Cards & Stationery",
  plants: "Plants",
  jewellery: "Jewellery & Accessories",
  toys: "Toys & Kids",
  other: "Other",
};

export const CATEGORY_ICONS: Record<string, string> = {
  flowers: "🌸",
  cakes: "🎂",
  sweets: "🍫",
  cards: "🎟️",
  fancy: "🧺",
  packages: "📦",
  stationery: "✉️",
  plants: "🪴",
  jewellery: "💍",
  toys: "🧸",
  other: "🎁",
};

export const MAX_LISTING_PHOTOS = 3;
export const SITE_NAME = "GiftX";

export function fmtLKR(n: number | null | undefined): string {
  return "Rs " + Number(n || 0).toLocaleString("en-LK");
}

export function primaryPhoto(listing: {
  photo_urls?: string[] | null;
  photo_url?: string | null;
}): string | null {
  if (listing.photo_urls && listing.photo_urls.length > 0) return listing.photo_urls[0];
  if (listing.photo_url) return listing.photo_url;
  return null;
}
