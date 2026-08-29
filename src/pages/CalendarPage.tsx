import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { getHolidaysForYear } from "@/lib/sriLankaHolidays";
import { CalendarGrid, type OccasionLike } from "@/components/calendar/CalendarGrid";
import { OccasionModal } from "@/components/calendar/OccasionModal";
import { MyDatesManager } from "@/components/calendar/MyDatesManager";
import { UpcomingList } from "@/components/calendar/UpcomingList";
import type { Occasion, UserSpecialDate } from "@/lib/types";

const today = new Date();

export function CalendarPage() {
  const { user } = useAuth();

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [myDates, setMyDates] = useState<UserSpecialDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openOccasion, setOpenOccasion] = useState<OccasionLike | null>(null);

  // Local dataset, not a network call — instant, no loading state needed.
  const holidays = useMemo(() => getHolidaysForYear(viewYear), [viewYear]);

  async function loadMyDates() {
    if (!user) {
      setMyDates([]);
      return;
    }
    const { signal, clear } = createTimeoutSignal();
    try {
      const { data } = await supabase
        .from("user_special_dates")
        .select("*")
        .eq("user_id", user.id)
        .abortSignal(signal);
      setMyDates(data ?? []);
    } catch {
      // Non-fatal — the global occasions/holidays still render fine.
    } finally {
      clear();
    }
  }

  // Occasions (global, same every year) + the user's own dates load once.
  useEffect(() => {
    let cancelled = false;
    const { signal, clear } = createTimeoutSignal();

    (async () => {
      try {
        const { data, error } = await supabase.from("occasions").select("*").abortSignal(signal);
        if (cancelled) return;
        if (error) {
          setError(friendlyError(error.message));
        } else {
          setOccasions(data ?? []);
        }
        await loadMyDates();
      } catch (err) {
        if (!cancelled) setError(friendlyError(err instanceof Error ? err.message : String(err)));
      } finally {
        clear();
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="mx-auto max-w-[1300px] px-[6vw] py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Gift Calendar</h1>
      <p className="mb-6 text-sm font-medium text-ink-soft">
        Global occasions, Sri Lankan public holidays, and the dates that matter to you.
      </p>

      {loading ? (
        <p className="text-sm font-semibold text-ink-soft">Loading…</p>
      ) : error ? (
        <div className="rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <CalendarGrid
              viewMonth={viewMonth}
              viewYear={viewYear}
              occasions={occasions}
              myDates={myDates}
              holidays={holidays}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onDayClick={setOpenOccasion}
            />
            <MyDatesManager myDates={myDates} onChanged={loadMyDates} />
          </div>

          <div className="lg:sticky lg:top-[90px] lg:self-start">
            <UpcomingList occasions={occasions} myDates={myDates} />
          </div>
        </div>
      )}

      {openOccasion ? <OccasionModal occasion={openOccasion} onClose={() => setOpenOccasion(null)} /> : null}
    </div>
  );
}