import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { ListingWithStore } from "@/lib/types";
import { matchScore, searchTokens } from "@/lib/search";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { ReminderBanner } from "@/components/marketplace/ReminderBanner";
import { SearchBar } from "@/components/marketplace/SearchBar";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar";
import { ProductCard } from "@/components/marketplace/ProductCard";

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<ListingWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(searchParams.get("occasion") ?? "");
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.get("occasion") ?? "");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeAvailability, setActiveAvailability] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const { signal, clear } = createTimeoutSignal();

    (async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(
            "id, store_id, name, description, category, price, fulfillment_type, quantity, lead_time_days, photo_url, photo_urls, search_keywords, is_active, created_at, stores ( id, store_name, offers_delivery, offers_pickup, delivery_radius_km )"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .abortSignal(signal);

        if (cancelled) return;
        if (error) {
          setError(friendlyError(error.message));
        } else {
          setListings((data as unknown as ListingWithStore[]) ?? []);
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
  }, []);

  // A listing that arrived via a deep link (e.g. clicking an occasion on the
  // Gift Calendar page, once that's built) - clear it from the URL after
  // reading it once so it doesn't stick around on refresh/back.
  useEffect(() => {
    if (searchParams.get("occasion")) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableCategories = useMemo(
    () => [...new Set(listings.map((l) => l.category))],
    [listings]
  );

  const results = useMemo(() => {
    const tokens = searchTokens(submittedQuery);

    let items = listings.filter((l) => {
      if (tokens.length && matchScore(l, tokens) === 0) return false;
      if (activeCategories.size && !activeCategories.has(l.category)) return false;
      if (activeAvailability.size && !activeAvailability.has(l.fulfillment_type)) return false;
      return true;
    });

    if (tokens.length) {
      items = items.slice().sort((a, b) => matchScore(b, tokens) - matchScore(a, tokens));
    }
    return items;
  }, [listings, submittedQuery, activeCategories, activeAvailability]);

  function toggleCategory(cat: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  function toggleAvailability(avail: string) {
    setActiveAvailability((prev) => {
      const next = new Set(prev);
      if (next.has(avail)) {
        next.delete(avail);
      } else {
        next.add(avail);
      }
      return next;
    });
  }

  function runSearch(overrideQuery?: string) {
    setSubmittedQuery(overrideQuery ?? query);
    document.getElementById("marketplace-results")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <ReminderBanner
        onSendGift={(keywords) => {
          setQuery(keywords);
          runSearch(keywords);
        }}
      />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-plum/15 blur-[90px]" />
          <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-gold/25 blur-[90px]" />
        </div>

        <div className="mx-auto max-w-[1100px] px-[6vw] pb-2.5 pt-12">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-gold-tint px-3 py-1.5 text-[12px] font-bold text-gold-deep">
            🎀 Independent sellers, curated for you
          </span>
          <h1 className="max-w-[700px] font-display text-[clamp(32px,4.6vw,54px)] font-semibold leading-[1.1] text-ink">
            Sri Lanka&rsquo;s gift marketplace, <span className="text-plum">made personal.</span>
          </h1>
          <p className="mt-4 max-w-[520px] text-base font-medium text-ink-soft">
            Independent florists, bakers, and hamper artists - search by the moment, not a fixed
            category.
          </p>

          <SearchBar value={query} onChange={setQuery} onSubmit={() => runSearch()} />
        </div>
      </section>

      <section id="marketplace-results" className="mx-auto max-w-[1100px] px-[6vw] pb-20 pt-10">
        <div className="mb-5 flex items-end justify-between border-b border-line pb-4">
          <h2 className="m-0 font-display text-xl font-semibold text-ink">Browse listings</h2>
          {!loading ? (
            <div className="rounded-full bg-plum-tint px-3 py-1 text-[12.5px] font-bold text-plum">
              {results.length} listing{results.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[220px_1fr]">
          <FilterSidebar
            availableCategories={availableCategories}
            activeCategories={activeCategories}
            onToggleCategory={toggleCategory}
            activeAvailability={activeAvailability}
            onToggleAvailability={toggleAvailability}
          />

          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {loading ? (
              <div className="col-span-full py-16 text-center text-sm font-semibold text-ink-soft">
                Loading listings…
              </div>
            ) : error ? (
              <div className="col-span-full rounded-2xl bg-brick-tint p-6 text-center text-sm font-semibold text-brick">
                Couldn&rsquo;t load listings right now: {error}
              </div>
            ) : results.length > 0 ? (
              results.map((listing) => <ProductCard key={listing.id} listing={listing} />)
            ) : (
              <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-semibold text-ink-soft">
                  No matches - try a broader search or clear a filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}