import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError, withTimeout } from "@/lib/supabaseFetch";
import { CATEGORIES, MAX_LISTING_PHOTOS } from "@/lib/constants";
import type { FulfillmentType, Listing } from "@/lib/types";

export function ListingForm({
  storeId,
  editingListing,
  onSaved,
  onCancel,
}: {
  storeId: string;
  editingListing: Listing | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  // Initial values come straight from editingListing. The parent renders
  // this with a `key` that changes whenever the target listing changes, so
  // React remounts (and re-initializes) this component instead of needing
  // an effect to sync state to a changing prop.
  const [name, setName] = useState(editingListing?.name ?? "");
  const [description, setDescription] = useState(editingListing?.description ?? "");
  const [category, setCategory] = useState(editingListing?.category ?? Object.keys(CATEGORIES)[0]);
  const [price, setPrice] = useState(editingListing ? String(editingListing.price) : "");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    editingListing?.fulfillment_type ?? "in_stock"
  );
  const [quantity, setQuantity] = useState(editingListing ? String(editingListing.quantity ?? 0) : "1");
  const [leadDays, setLeadDays] = useState(editingListing ? String(editingListing.lead_time_days ?? 0) : "1");
  const [keywords, setKeywords] = useState(editingListing?.search_keywords ?? "");
  const existingPhotoUrls: string[] = (() => {
    if (!editingListing) return [];
    if (editingListing.photo_urls?.length) return editingListing.photo_urls;
    return editingListing.photo_url ? [editingListing.photo_url] : [];
  })();
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_LISTING_PHOTOS) {
      setMessage({
        text: `You can upload up to ${MAX_LISTING_PHOTOS} photos — only the first ${MAX_LISTING_PHOTOS} will be used.`,
        type: "error",
      });
    }
    setNewFiles(files.slice(0, MAX_LISTING_PHOTOS));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      // Selecting new files replaces the listing's photos entirely — matches
      // the original's behavior rather than appending to existing ones.
      let photoUrls = existingPhotoUrls;
      if (newFiles.length) {
        photoUrls = [];
        for (const file of newFiles) {
          const path = `${storeId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await withTimeout(
            supabase.storage.from("giftx-photos").upload(path, file)
          );
          if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
          const { data: publicUrlData } = supabase.storage.from("giftx-photos").getPublicUrl(path);
          photoUrls.push(publicUrlData.publicUrl);
        }
      }

      const payload = {
        store_id: storeId,
        name: name.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        fulfillment_type: fulfillmentType,
        quantity: fulfillmentType === "in_stock" ? Number(quantity) : 0,
        lead_time_days: fulfillmentType === "pre_order" ? Number(leadDays) : 0,
        search_keywords: keywords.trim(),
        photo_urls: photoUrls,
      };

      const { signal, clear } = createTimeoutSignal();
      try {
        const query = editingListing
          ? supabase.from("listings").update(payload).eq("id", editingListing.id)
          : supabase.from("listings").insert(payload);

        const { error } = await query.abortSignal(signal);
        if (error) throw new Error(error.message);
      } finally {
        clear();
      }

      onSaved();
    } catch (err) {
      setMessage({ text: friendlyError(err instanceof Error ? err.message : String(err)), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-[16px] border border-line p-5">
      {message ? (
        <div
          className={`mb-4 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ${
            message.type === "error" ? "bg-brick-tint text-brick" : "bg-forest-tint text-forest"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <label className="mb-3.5 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Item name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
        />
      </label>

      <label className="mb-3.5 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe it the way you'd describe it to a customer in front of you"
          rows={2}
          className="w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
        />
      </label>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
          >
            {Object.entries(CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Price (Rs)</span>
          <input
            type="number"
            min={0}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
          />
        </label>
      </div>

      <div className="mb-3.5">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Fulfilment</span>
        <div className="flex gap-1.5 rounded-xl bg-plum-tint p-1.5">
          <button
            type="button"
            onClick={() => setFulfillmentType("in_stock")}
            className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
              fulfillmentType === "in_stock" ? "bg-plum text-white" : "text-ink-soft"
            }`}
          >
            In stock
          </button>
          <button
            type="button"
            onClick={() => setFulfillmentType("pre_order")}
            className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
              fulfillmentType === "pre_order" ? "bg-plum text-white" : "text-ink-soft"
            }`}
          >
            Pre-order
          </button>
        </div>
      </div>

      <div className="mb-3.5">
        {fulfillmentType === "in_stock" ? (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Quantity available</span>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Lead time (days)</span>
            <input
              type="number"
              min={0}
              value={leadDays}
              onChange={(e) => setLeadDays(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
            />
          </label>
        )}
      </div>

      <label className="mb-3.5 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          Search keywords <span className="font-medium normal-case">(optional — helps buyers find this)</span>
        </span>
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="birthday, romantic, office party..."
          className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          Photos <span className="font-medium normal-case">(up to {MAX_LISTING_PHOTOS})</span>
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full text-sm"
        />
        {existingPhotoUrls.length > 0 && newFiles.length === 0 ? (
          <div className="mt-2 flex gap-2">
            {existingPhotoUrls.map((url) => (
              <img key={url} src={url} alt="" className="h-14 w-14 rounded-xl border border-line object-cover" />
            ))}
          </div>
        ) : null}
      </label>

      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-plum px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-plum-deep disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save listing"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-line px-6 py-2.5 text-sm font-bold text-ink hover:border-plum hover:text-plum"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}