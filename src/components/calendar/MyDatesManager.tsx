import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import type { UserSpecialDate } from "@/lib/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MyDatesManager({
  myDates,
  onChanged,
}: {
  myDates: UserSpecialDate[];
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [label, setLabel] = useState("");
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !label.trim()) return;
    setSubmitting(true);
    setMessage(null);

    const { signal, clear } = createTimeoutSignal();
    try {
      const { error } = await supabase
        .from("user_special_dates")
        .insert({ user_id: user.id, label: label.trim(), month, day })
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      setMessage({ text: "Saved! We'll remind you as it gets close.", type: "success" });
      setLabel("");
      onChanged();
    } catch (err) {
      setMessage({ text: friendlyError(err instanceof Error ? err.message : String(err)), type: "error" });
    } finally {
      clear();
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const { signal, clear } = createTimeoutSignal();
    try {
      const { error } = await supabase.from("user_special_dates").delete().eq("id", id).abortSignal(signal);
      if (error) throw new Error(error.message);
      onChanged();
    } catch (err) {
      setMessage({ text: friendlyError(err instanceof Error ? err.message : String(err)), type: "error" });
    } finally {
      clear();
    }
  }

  if (!user) {
    return (
      <div className="rounded-[20px] bg-white p-6 text-center shadow-card ring-1 ring-black/[0.03]">
        <p className="mb-3 text-sm font-semibold text-ink-soft">
          Log in to save birthdays and anniversaries — we&rsquo;ll remind you before they arrive.
        </p>
        <Link
          to="/auth"
          className="inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
        >
          Log in / Sign up
        </Link>
      </div>
    );
  }

  const sorted = myDates.slice().sort((a, b) => a.month - b.month || a.day - b.day);

  return (
    <div className="rounded-[20px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Your saved dates</h2>

      {message ? (
        <div
          className={`mb-4 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ${
            message.type === "error" ? "bg-brick-tint text-brick" : "bg-forest-tint text-forest"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mb-5 flex flex-wrap items-end gap-2">
        <label className="flex-1 basis-[140px]">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">What&rsquo;s the occasion?</span>
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Mom's birthday"
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-plum"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">Day</span>
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-plum"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Add"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-sm font-medium text-ink-soft">No saved dates yet.</p>
      ) : (
        <div>
          {sorted.map((d) => (
            <div key={d.id} className="flex items-center justify-between border-b border-line py-2.5 last:border-b-0">
              <div>
                <div className="text-[13.5px] font-bold text-ink">{d.label}</div>
                <div className="text-[12px] font-medium text-ink-soft">
                  {MONTH_NAMES[d.month - 1]} {d.day}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] font-bold text-ink-soft hover:border-brick hover:text-brick"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}