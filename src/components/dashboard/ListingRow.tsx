import { useState } from "react";
import { fmtLKR } from "@/lib/constants";
import type { Listing } from "@/lib/types";

export function ListingRow({
  listing,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  listing: Listing;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5 last:border-b-0">
      <div>
        <div className="text-[14px] font-bold text-ink">
          {listing.name}
          {!listing.is_active ? (
            <span className="ml-2 rounded-full bg-brick-tint px-2 py-0.5 text-[10px] font-extrabold uppercase text-brick">
              Hidden
            </span>
          ) : null}
        </div>
        <div className="text-[12.5px] font-medium text-ink-soft">
          {fmtLKR(listing.price)} ·{" "}
          {listing.fulfillment_type === "in_stock"
            ? `${listing.quantity ?? 0} left`
            : `Pre-order, ${listing.lead_time_days ?? 0}d lead`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {confirmingDelete ? (
          <>
            <span className="text-[12.5px] font-semibold text-brick">Delete for good?</span>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full bg-brick px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-brick/90"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-ink-soft hover:border-plum hover:text-plum"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-ink-soft hover:border-plum hover:text-plum"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onToggleActive}
              className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-ink-soft hover:border-plum hover:text-plum"
            >
              {listing.is_active ? "Hide" : "Unhide"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-brick hover:border-brick"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}