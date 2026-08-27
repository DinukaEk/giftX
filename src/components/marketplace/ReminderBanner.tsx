import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { daysUntil } from "@/lib/dates";

interface UpcomingItem {
  title: string;
  days: number;
  keywords: string;
  personal: boolean;
}

function dismissedKey() {
  return "giftx_dismissed_reminder_" + new Date().toDateString();
}

export function ReminderBanner({ onSendGift }: { onSendGift: (keywords: string) => void }) {
  const { user } = useAuth();
  const [top, setTop] = useState<UpcomingItem | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(dismissedKey()) === "1");

  useEffect(() => {
    if (dismissed) return;

    let cancelled = false;

    (async () => {
      try {
        const upcoming: UpcomingItem[] = [];

        const { data: occasions } = await supabase.from("occasions").select("*");
        (occasions ?? []).forEach((o) => {
          const d = daysUntil(o.month, o.day);
          if (d <= 7) {
            upcoming.push({
              title: o.title,
              days: d,
              keywords: o.suggested_keywords || o.title,
              personal: false,
            });
          }
        });

        if (user) {
          const { data: mine } = await supabase
            .from("user_special_dates")
            .select("*")
            .eq("user_id", user.id);
          (mine ?? []).forEach((o) => {
            const d = daysUntil(o.month, o.day);
            if (d <= 7) upcoming.push({ title: o.label, days: d, keywords: o.label, personal: true });
          });
        }

        if (cancelled || upcoming.length === 0) return;
        upcoming.sort((a, b) => a.days - b.days);
        setTop(upcoming[0]);
      } catch {
        // Reminder banner is a nice-to-have — silently skip it on any
        // network failure rather than disrupting the rest of the page.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, dismissed]);

  function handleDismiss() {
    sessionStorage.setItem(dismissedKey(), "1");
    setDismissed(true);
  }

  if (dismissed || !top) return null;

  const when = top.days === 0 ? "today" : top.days === 1 ? "tomorrow" : `in ${top.days} days`;

  return (
    <div className="bg-gold-tint px-[6vw] py-3">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
        <div className="text-[13.5px] font-semibold text-ink">
          🎉 {top.title} is coming up {when}!{" "}
          <span className="font-medium text-ink-soft">
            {top.personal ? "From your saved dates" : "Find something thoughtful before it sneaks up on you"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSendGift(top.keywords)}
            className="rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-ink shadow-sm hover:bg-plum hover:text-white"
          >
            Send a gift
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}