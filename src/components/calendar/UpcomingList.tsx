import { useNavigate } from "react-router-dom";
import { daysUntil } from "@/lib/dates";
import type { Occasion, UserSpecialDate } from "@/lib/types";

interface UpcomingItem {
  title: string;
  days: number;
  keywords: string;
  personal: boolean;
}

export function UpcomingList({ occasions, myDates }: { occasions: Occasion[]; myDates: UserSpecialDate[] }) {
  const navigate = useNavigate();

  const upcoming: UpcomingItem[] = [
    ...occasions.map((o) => ({
      title: o.title,
      days: daysUntil(o.month, o.day),
      keywords: o.suggested_keywords || o.title,
      personal: false,
    })),
    ...myDates.map((d) => ({
      title: d.label,
      days: daysUntil(d.month, d.day),
      keywords: d.label,
      personal: true,
    })),
  ]
    .filter((item) => item.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-[20px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Coming up in the next 30 days</h2>
      <div>
        {upcoming.map((item, i) => (
          <div
            key={`${item.title}-${i}`}
            className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
          >
            <div>
              <div className="text-[13.5px] font-bold text-ink">
                {item.personal ? "🎂 " : "🎉 "}
                {item.title}
              </div>
              <div className="text-[12px] font-medium text-ink-soft">
                {item.days === 0 ? "Today" : item.days === 1 ? "Tomorrow" : `In ${item.days} days`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/?occasion=${encodeURIComponent(item.keywords)}`)}
              className="flex-none rounded-full bg-plum-tint px-3 py-1.5 text-[12px] font-bold text-plum hover:bg-plum hover:text-white"
            >
              Send a gift
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}