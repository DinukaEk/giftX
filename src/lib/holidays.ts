import { withTimeout } from "@/lib/supabaseFetch";

export interface Holiday {
  title: string;
  month: number;
  day: number;
}

/** Free, no-API-key public holidays API. Fails silently — the calendar
 *  still works fine with just GiftX's own occasions if this is unreachable. */
export async function fetchHolidays(year: number): Promise<Holiday[]> {
  try {
    const res = await withTimeout(fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/LK`), 10000);
    if (!res.ok) return [];
    const data: { date: string; localName: string; name: string }[] = await res.json();
    return data.map((h) => {
      const [, m, d] = h.date.split("-").map(Number);
      return { title: h.localName || h.name, month: m, day: d };
    });
  } catch {
    return [];
  }
}