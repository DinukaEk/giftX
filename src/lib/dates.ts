/** Days from today until the next occurrence of a recurring month/day (birthdays, holidays, etc). */
export function daysUntil(month: number, day: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/** e.g. "14 Feb, 10:32" - used in the order status timeline. */
export function fmtDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}