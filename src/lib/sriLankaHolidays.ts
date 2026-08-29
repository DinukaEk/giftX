export interface Holiday {
  title: string;
  month: number;
  day: number;
}

/**
 * Fixed Gregorian-calendar dates — the same every year. Confirmed consistent
 * across the official 2026 and 2027 government gazettes, so these never need
 * updating.
 */
const RECURRING_HOLIDAYS: Holiday[] = [
  { title: "Independence Day", month: 2, day: 4 },
  { title: "Day Prior to Sinhala & Tamil New Year", month: 4, day: 13 },
  { title: "Sinhala & Tamil New Year Day", month: 4, day: 14 },
  { title: "May Day", month: 5, day: 1 },
  { title: "Christmas Day", month: 12, day: 25 },
];

/**
 * Good Friday is always the Friday before Easter Sunday — computed with the
 * standard Easter-dating algorithm (Anonymous Gregorian / Meeus–Jones–Butcher),
 * so this never needs a manual update either. Verified against the official
 * 2026 (Apr 3) and 2027 (Mar 26) gazettes — both matched exactly.
 */
function computeGoodFriday(year: number): Holiday {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, easterMonth - 1, easterDay);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  return { title: "Good Friday", month: goodFriday.getMonth() + 1, day: goodFriday.getDate() };
}

/**
 * Islamic (Hijri) and Hindu lunisolar holidays — these genuinely shift every
 * year and can't be computed without a full calendar-conversion library, so
 * this list needs one small update per year once the government gazette is
 * published (usually Nov/Dec of the prior year). Note Thai Pongal shifted
 * from Jan 14 (2026) to Jan 15 (2027) — even the "solar" Tamil holidays drift
 * by a day sometimes, which is why it lives here rather than in the
 * permanently-fixed list above.
 *
 * To add a future year once it's gazetted: add another `year: [...]` entry
 * in the same shape.
 */
const MOVABLE_HOLIDAYS: Record<number, Holiday[]> = {
  2026: [
    { title: "Tamil Thai Pongal Day", month: 1, day: 14 },
    { title: "Mahasivarathri Day", month: 2, day: 15 },
    { title: "Id-Ul-Fitr", month: 3, day: 21 },
    { title: "Id-Ul-Alha", month: 5, day: 27 },
    { title: "Milad-un-Nabi", month: 8, day: 25 },
    { title: "Deepavali", month: 11, day: 8 },
  ],
  2027: [
    { title: "Tamil Thai Pongal Day", month: 1, day: 15 },
    { title: "Maha Shivarathri Day", month: 3, day: 6 },
    { title: "Id-Ul-Fitr", month: 3, day: 10 },
    { title: "Id-Ul-Alha", month: 5, day: 17 },
    { title: "Milad-un-Nabi", month: 8, day: 15 },
    { title: "Deepavali", month: 10, day: 28 },
  ],
};

export function getHolidaysForYear(year: number): Holiday[] {
  return [...RECURRING_HOLIDAYS, computeGoodFriday(year), ...(MOVABLE_HOLIDAYS[year] ?? [])];
}