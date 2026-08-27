import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { useAuth } from "@/context/AuthContext";
import type { Store } from "@/lib/types";

export function StoreForm({ store, onSaved }: { store: Store | null; onSaved: (store: Store) => void }) {
  const { user } = useAuth();

  const [name, setName] = useState(store?.store_name ?? "");
  const [description, setDescription] = useState(store?.description ?? "");
  const [radius, setRadius] = useState(store?.delivery_radius_km ?? 4);
  const [courierNote, setCourierNote] = useState(store?.courier_note ?? "");
  const [offersDelivery, setOffersDelivery] = useState(store?.offers_delivery ?? false);
  const [offersPickup, setOffersPickup] = useState(store?.offers_pickup ?? true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMessage(null);
    setSaving(true);

    const payload = {
      seller_id: user.id,
      store_name: name.trim(),
      description: description.trim(),
      delivery_radius_km: Number(radius) || 0,
      courier_note: courierNote.trim(),
      offers_delivery: offersDelivery,
      offers_pickup: offersPickup,
    };

    const { signal, clear } = createTimeoutSignal();
    try {
      const query = store
        ? supabase.from("stores").update(payload).eq("id", store.id)
        : supabase.from("stores").insert(payload);

      const { data, error } = await query.select().abortSignal(signal).single();

      if (error || !data) {
        setMessage({ text: friendlyError(error?.message), type: "error" });
        return;
      }
      setMessage({ text: "Store saved!", type: "success" });
      onSaved(data as Store);
    } catch (err) {
      setMessage({ text: friendlyError(err instanceof Error ? err.message : String(err)), type: "error" });
    } finally {
      clear();
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">
        {store ? "Your store" : "Set up your store"}
      </h2>

      {message ? (
        <div
          className={`mb-4 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ${
            message.type === "error" ? "bg-brick-tint text-brick" : "bg-forest-tint text-forest"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <label className="mb-3.5 block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Store name</span>
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
            placeholder="Tell buyers what your store is about"
            rows={2}
            className="w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
          />
        </label>

        <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Delivery radius (km)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">How your deliveries go out</span>
            <input
              value={courierNote}
              onChange={(e) => setCourierNote(e.target.value)}
              placeholder="e.g. own rider, PickMe, Koombiyo"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
            />
          </label>
        </div>

        <div className="mb-5">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Fulfilment options</span>
          <div className="flex gap-1.5 rounded-xl bg-plum-tint p-1.5">
            <button
              type="button"
              onClick={() => setOffersDelivery((v) => !v)}
              className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
                offersDelivery ? "bg-plum text-white" : "text-ink-soft"
              }`}
            >
              Offers delivery
            </button>
            <button
              type="button"
              onClick={() => setOffersPickup((v) => !v)}
              className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
                offersPickup ? "bg-plum text-white" : "text-ink-soft"
              }`}
            >
              Offers pickup
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-plum px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-plum-deep disabled:opacity-60"
        >
          {saving ? "Saving…" : store ? "Update store" : "Save store"}
        </button>
      </form>
    </div>
  );
}