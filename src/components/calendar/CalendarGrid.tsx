// import type { Holiday } from "@/lib/holidays";
import type { Holiday } from "@/lib/sriLankaHolidays";
import type { Occasion, UserSpecialDate } from "@/lib/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface OccasionLike {
  title: string;
  description: string | null;
  suggested_keywords: string | null;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function CalendarGrid({
  viewMonth,
  viewYear,
  occasions,
  myDates,
  holidays,
  onPrevMonth,
  onNextMonth,
  onDayClick,
}: {
  viewMonth: number;
  viewYear: number;
  occasions: Occasion[];
  myDates: UserSpecialDate[];
  holidays: Holiday[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (occ: OccasionLike) => void;
}) {
  const today = new Date();
  const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }

  for (let day = 1; day <= totalDays; day++) {
    const occ = occasions.filter((o) => o.month === viewMonth + 1 && o.day === day);
    const mine = myDates.filter((o) => o.month === viewMonth + 1 && o.day === day);
    const hol = holidays.filter((o) => o.month === viewMonth + 1 && o.day === day);

    let bg = "bg-white hover:bg-plum-tint/40";
    if (occ.length) bg = "bg-plum-tint hover:bg-plum-tint";
    else if (hol.length) bg = "bg-gold-tint hover:bg-gold-tint";
    else if (mine.length) bg = "bg-forest-tint hover:bg-forest-tint";

    const isToday = isCurrentMonth && day === today.getDate();
    const label = occ[0]?.title || hol[0]?.title || mine[0]?.label || "";
    const clickable = occ.length > 0 || hol.length > 0;

    function handleClick() {
      if (occ.length) {
        onDayClick({ title: occ[0].title, description: occ[0].description, suggested_keywords: occ[0].suggested_keywords });
      } else if (hol.length) {
        onDayClick({ title: hol[0].title, description: "Sri Lanka public holiday.", suggested_keywords: hol[0].title });
      }
    }

    cells.push(
      <button
        key={day}
        type="button"
        onClick={clickable ? handleClick : undefined}
        className={`flex h-20 flex-col items-start rounded-xl p-1.5 text-left transition-colors ${bg} ${
          clickable ? "cursor-pointer" : "cursor-default"
        } ${isToday ? "ring-2 ring-plum" : ""}`}
      >
        <span className={`text-[12.5px] font-bold ${isToday ? "text-plum" : "text-ink"}`}>{day}</span>
        {label ? (
          <span className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight text-ink-soft">{label}</span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-card ring-1 ring-black/[0.03]">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-plum-tint hover:text-plum"
        >
          ←
        </button>
        <h2 className="font-display text-lg font-semibold text-ink">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-plum-tint hover:text-plum"
        >
          →
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold uppercase text-ink-soft">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">{cells}</div>

      <div className="mt-4 flex flex-wrap gap-3 text-[11.5px] font-medium text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-plum-tint" /> Occasion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gold-tint" /> Public holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-forest-tint" /> Your saved date
        </span>
      </div>
    </div>
  );
}