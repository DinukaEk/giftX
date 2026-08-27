import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { ListingForm } from "./ListingForm";
import { ListingRow } from "./ListingRow";
import type { Listing } from "@/lib/types";

export function ListingsManager({ storeId }: { storeId: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  async function loadListings() {
    setLoading(true);
    setError(null);
    const { signal, clear } = createTimeoutSignal();
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .abortSignal(signal);

      if (error) throw new Error(error.message);
      setListings((data as Listing[]) ?? []);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      clear();
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  function openNewListingForm() {
    setEditingListing(null);
    setFormOpen(true);
  }

  function openEditForm(listing: Listing) {
    setEditingListing(listing);
    setFormOpen(true);
    document.getElementById("listings-card")?.scrollIntoView({ behavior: "smooth" });
  }

  function closeForm() {
    setFormOpen(false);
    setEditingListing(null);
  }

  function handleSaved() {
    closeForm();
    void loadListings();
  }

  async function toggleActive(listing: Listing) {
    const { signal, clear } = createTimeoutSignal();
    try {
      const { error } = await supabase
        .from("listings")
        .update({ is_active: !listing.is_active })
        .eq("id", listing.id)
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      void loadListings();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      clear();
    }
  }

  async function deleteListing(listing: Listing) {
    const { signal, clear } = createTimeoutSignal();
    try {
      const { error } = await supabase.from("listings").delete().eq("id", listing.id).abortSignal(signal);
      if (error) throw new Error(error.message);
      void loadListings();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      clear();
    }
  }

  return (
    <div id="listings-card" className="mt-6 rounded-[20px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">Your listings</h2>

      {error ? (
        <div className="mb-4 rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-sm font-semibold text-ink-soft">Loading listings…</p>
      ) : listings.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-ink-soft">
          You don&rsquo;t have any listings yet. Click &ldquo;Add a new listing&rdquo; below.
        </p>
      ) : (
        <div>
          {listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              onEdit={() => openEditForm(listing)}
              onToggleActive={() => toggleActive(listing)}
              onDelete={() => deleteListing(listing)}
            />
          ))}
        </div>
      )}

      {formOpen ? (
        <ListingForm
          key={editingListing?.id ?? "new"}
          storeId={storeId}
          editingListing={editingListing}
          onSaved={handleSaved}
          onCancel={closeForm}
        />
      ) : (
        <button
          type="button"
          onClick={openNewListingForm}
          className="mt-5 rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-plum hover:text-plum"
        >
          + Add a new listing
        </button>
      )}
    </div>
  );
}