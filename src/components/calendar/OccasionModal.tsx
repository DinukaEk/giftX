import { useNavigate } from "react-router-dom";
import type { OccasionLike } from "./CalendarGrid";

export function OccasionModal({ occasion, onClose }: { occasion: OccasionLike; onClose: () => void }) {
  const navigate = useNavigate();

  function sendGift() {
    navigate(`/?occasion=${encodeURIComponent(occasion.suggested_keywords || occasion.title)}`);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={onClose} aria-hidden className="absolute inset-0 bg-plum-deep/30 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[420px] rounded-[20px] bg-white p-6 shadow-card-lg">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-plum-tint hover:text-plum"
        >
          ✕
        </button>
        <h2 className="mb-1 pr-8 font-display text-lg font-semibold text-ink">{occasion.title}</h2>
        {occasion.description ? <p className="mb-5 text-sm text-ink-soft">{occasion.description}</p> : null}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={sendGift}
            className="flex-1 rounded-xl bg-plum py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
          >
            Send a gift for this
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:border-plum hover:text-plum"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}