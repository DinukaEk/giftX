import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { CATEGORIES, CATEGORY_ICONS, fmtLKR } from "@/lib/constants";
import { SendGiftModal } from "@/components/cart/SendGiftModal";
import type { ListingWithStore } from "@/lib/types";

export function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingWithStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const { signal, clear } = createTimeoutSignal();

    (async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(
            "id, store_id, name, description, category, price, fulfillment_type, quantity, lead_time_days, photo_url, photo_urls, search_keywords, is_active, created_at, stores ( id, store_name, description, offers_delivery, offers_pickup, delivery_radius_km )"
          )
          .eq("id", id)
          .eq("is_active", true)
          .abortSignal(signal)
          .single();

        if (cancelled) return;
        if (error || !data) {
          setError(
            error ? friendlyError(error.message) : "This listing isn't available — it may have been removed."
          );
        } else {
          setListing(data as unknown as ListingWithStore);
        }
      } catch (err) {
        if (cancelled) return;
        setError(friendlyError(err instanceof Error ? err.message : String(err)));
      } finally {
        clear();
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clear();
    };
  }, [id]);

  // Basic client-side SEO — this is a plain SPA (no server rendering), so
  // this helps the browser tab/title and anything that reads document.title,
  // but won't produce server-rendered meta tags for crawlers or link
  // previews. That would need a framework with SSR (like the Next.js
  // rebuild) to do properly.
  useEffect(() => {
    if (!listing) return;
    document.title = `${listing.name} — ${listing.stores?.store_name ?? "GiftX"}`;
    return () => {
      document.title = "GiftX — Sri Lanka's gift marketplace";
    };
  }, [listing]);

  if (!id) {
    return (
      <div className="mx-auto max-w-[500px] px-6 py-24 text-center">
        <span className="mb-3 block text-3xl">🎁</span>
        <p className="text-sm font-semibold text-ink-soft">No listing specified.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep">
          Back to marketplace
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="px-[6vw] py-24 text-center text-sm font-semibold text-ink-soft">Loading listing…</div>;
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-[500px] px-6 py-24 text-center">
        <span className="mb-3 block text-3xl">🎁</span>
        <p className="text-sm font-semibold text-ink-soft">{error}</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const photos = listing.photo_urls?.length
    ? listing.photo_urls
    : listing.photo_url
      ? [listing.photo_url]
      : [];
  const icon = CATEGORY_ICONS[listing.category] ?? "🎁";

  return (
    <div className="mx-auto max-w-[1100px] px-[6vw] py-10">
      <nav className="mb-5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
        <Link to="/" className="hover:text-plum">
          Marketplace
        </Link>
        <span>/</span>
        <span className="truncate text-ink">{listing.name}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1.3fr_1fr]">
        <div>
          {photos.length > 0 ? (
            <div className={`mb-5 grid gap-2.5 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
              {photos.map((src, i) => (
                <div
                  key={src}
                  className={`group relative overflow-hidden rounded-[14px] bg-plum-tint ${
                    photos.length === 1 ? "aspect-[16/10]" : "aspect-square"
                  }`}
                >
                  <img
                    src={src}
                    alt={`${listing.name} photo ${i + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-5 flex aspect-[16/10] items-center justify-center rounded-[14px] bg-plum-tint text-3xl opacity-40">
              {icon}
            </div>
          )}

          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-plum-tint px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-plum">
            <span className="text-[12px]">{icon}</span>
            {CATEGORIES[listing.category] ?? listing.category}
          </span>
          <h1 className="mb-2 font-display text-2xl font-semibold text-ink">{listing.name}</h1>

          <span
            className={`mb-4 inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${
              listing.fulfillment_type === "in_stock"
                ? "bg-forest-tint text-forest"
                : "bg-gold-tint text-gold-deep"
            }`}
          >
            {listing.fulfillment_type === "in_stock"
              ? `In stock — ${listing.quantity ?? 0} left`
              : `Pre-order — ready in ${listing.lead_time_days ?? "a few"} day(s)`}
          </span>

          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {listing.description || "No description provided."}
          </p>
        </div>

        <div className="rounded-[18px] bg-white p-6 shadow-card ring-1 ring-black/[0.03] md:sticky md:top-[110px]">
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-ink-soft">
            {listing.stores?.store_name}
          </div>
          {listing.stores?.description ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{listing.stores.description}</p>
          ) : null}

          <div className="my-4 text-[26px] font-extrabold text-plum">{fmtLKR(listing.price)}</div>

          <SendGiftModal
            listing={{
              id: listing.id,
              name: listing.name,
              price: listing.price,
              photo: listing.photo_urls?.[0] ?? listing.photo_url ?? null,
              storeId: listing.store_id,
              storeName: listing.stores?.store_name ?? "GiftX seller",
              storeOffersDelivery: listing.stores?.offers_delivery ?? false,
              storeOffersPickup: listing.stores?.offers_pickup ?? false,
              fulfillmentType: listing.fulfillment_type,
              quantityAvailable: listing.quantity,
            }}
          />

          {(listing.stores?.offers_delivery || listing.stores?.offers_pickup) && (
            <div className="mt-4 border-t border-line pt-4 text-[12.5px] font-medium text-ink-soft">
              {listing.stores?.offers_delivery ? (
                <div>🚚 Delivery available (up to {listing.stores.delivery_radius_km} km)</div>
              ) : null}
              {listing.stores?.offers_pickup ? <div>📍 Pickup available</div> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}