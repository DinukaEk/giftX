import { useState } from "react";
import { Link } from "react-router-dom";
import type { ListingWithStore } from "@/lib/types";
import { CATEGORY_ICONS, fmtLKR } from "@/lib/constants";

const AVAILABILITY_BADGE: Record<string, { label: string; className: string }> = {
  in_stock: { label: "In stock", className: "bg-forest-tint text-forest" },
  pre_order: { label: "Pre-order", className: "bg-gold-tint text-gold-deep" },
};

export function ProductCard({ listing }: { listing: ListingWithStore }) {
  const photos = listing.photo_urls?.length
    ? listing.photo_urls
    : listing.photo_url
      ? [listing.photo_url]
      : [];
  const [activePhoto, setActivePhoto] = useState(0);

  const badge = AVAILABILITY_BADGE[listing.fulfillment_type];
  const icon = CATEGORY_ICONS[listing.category] ?? "🎁";

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-[18px] bg-white shadow-card ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-lg"
    >
      <div className="relative h-[150px] overflow-hidden bg-gradient-to-br from-plum-tint to-gold-tint">
        {photos.length > 0 ? (
          <img
            src={photos[activePhoto]}
            alt={listing.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl opacity-40">{icon}</div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-plum-deep/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {badge ? (
          <span
            className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide shadow-sm ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : null}

        {photos.length > 1 ? (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActivePhoto(i);
                }}
                aria-label={`Photo ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  i === activePhoto ? "w-3.5 bg-white" : "bg-white/60"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 text-[13px] leading-none">{icon}</span>
          <div className="text-[14.5px] font-bold leading-tight text-ink">{listing.name}</div>
        </div>
        {listing.stores ? (
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            by {listing.stores.store_name}
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
          <span className="text-[15.5px] font-extrabold text-plum">{fmtLKR(listing.price)}</span>
          <span className="text-[12px] font-bold text-plum opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}