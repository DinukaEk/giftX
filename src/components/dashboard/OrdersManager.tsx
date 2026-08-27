import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError, withTimeout } from "@/lib/supabaseFetch";
import { fmtLKR } from "@/lib/constants";
import type { OrderWithItems } from "@/lib/types";

function urgencyBadge(o: OrderWithItems): { label: string; className: string } | null {
  if (o.delivery_flexibility !== "exact" || !o.requested_delivery_date) return null;
  if (o.status === "confirmed" || o.status === "disputed") return null;

  const due = new Date(o.requested_delivery_date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) return { label: `⚠️ Overdue - was due ${o.requested_delivery_date}`, className: "bg-brick-tint text-brick" };
  if (daysLeft === 0) return { label: "⏰ Due today!", className: "bg-brick-tint text-brick" };
  if (daysLeft <= 2) return { label: `⏰ Due in ${daysLeft}d`, className: "bg-gold-tint text-gold-deep" };
  return { label: `Due by ${o.requested_delivery_date}`, className: "bg-plum-tint text-ink-soft" };
}

function OrderRow({ order, onChanged }: { order: OrderWithItems; onChanged: () => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addingUpdate, setAddingUpdate] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const urgency = urgencyBadge(order);

  async function handlePackedFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setMessage(null);
    setSubmitting(true);

    try {
      const path = `orders/${order.id}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await withTimeout(supabase.storage.from("giftx-photos").upload(path, file));
      if (uploadError) throw new Error(uploadError.message);
      const { data: publicUrlData } = supabase.storage.from("giftx-photos").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "packed", packed_photo_url: publicUrlData.publicUrl })
        .eq("id", order.id);
      if (updateError) throw new Error(updateError.message);

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "packed",
        photo_url: publicUrlData.publicUrl,
        created_by: user.id,
        note: "Seller packed and photographed the item.",
      });

      setMessage({ text: "Marked as packed! The buyer can now confirm the order.", type: "success" });
      onChanged();
    } catch (err) {
      setMessage({ text: friendlyError(err instanceof Error ? err.message : String(err)), type: "error" });
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function sendUpdate() {
    if (!user || !updateText.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "update",
        created_by: user.id,
        note: updateText.trim(),
      });
      if (error) throw new Error(error.message);
      setMessage({ text: "Update sent to the buyer.", type: "success" });
      setUpdateText("");
      setAddingUpdate(false);
    } catch (err) {
      setMessage({ text: friendlyError(err instanceof Error ? err.message : String(err)), type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-b border-line py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold text-ink">
            Order #{order.id.slice(0, 8)}
            <span className="rounded-full bg-plum-tint px-2 py-0.5 text-[10px] font-extrabold uppercase text-plum">
              {order.status}
            </span>
            {urgency ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${urgency.className}`}>
                {urgency.label}
              </span>
            ) : null}
          </div>
          <div className="text-[12.5px] font-medium text-ink-soft">
            {order.order_items.map((it) => `${it.listing_name_snapshot} × ${it.quantity}`).join(", ")} ·{" "}
            {fmtLKR(order.subtotal)} · {order.delivery_method}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.status === "placed" ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePackedFile}
                className="hidden"
              />
              <button
                type="button"
                disabled={submitting}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-plum px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-plum-deep disabled:opacity-60"
              >
                {submitting ? "Uploading…" : "Mark as packed"}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setAddingUpdate((v) => !v)}
            className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-ink-soft hover:border-plum hover:text-plum"
          >
            + Add update
          </button>
          <Link
            to={`/orders/${order.id}`}
            className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-ink-soft hover:border-plum hover:text-plum"
          >
            View
          </Link>
        </div>
      </div>

      {message ? (
        <div
          className={`mt-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold ${
            message.type === "error" ? "bg-brick-tint text-brick" : "bg-forest-tint text-forest"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {addingUpdate ? (
        <div className="mt-3 flex gap-2">
          <input
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            placeholder='e.g. "Courier picked up, arriving by 5pm today"'
            className="flex-1 rounded-xl border border-line bg-white px-3.5 py-2 text-sm outline-none focus:border-plum"
          />
          <button
            type="button"
            onClick={sendUpdate}
            disabled={submitting || !updateText.trim()}
            className="rounded-xl bg-plum px-4 py-2 text-sm font-bold text-white hover:bg-plum-deep disabled:opacity-60"
          >
            Send
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function OrdersManager({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    const { signal, clear } = createTimeoutSignal();
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .abortSignal(signal);

      if (error) throw new Error(error.message);
      setOrders((data as unknown as OrderWithItems[]) ?? []);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      clear();
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return (
    <div className="mt-6 rounded-[20px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">Incoming orders</h2>

      {error ? (
        <div className="mb-4 rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-sm font-semibold text-ink-soft">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-ink-soft">
          No orders yet. They&rsquo;ll show up here.
        </p>
      ) : (
        <div>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onChanged={loadOrders} />
          ))}
        </div>
      )}
    </div>
  );
}