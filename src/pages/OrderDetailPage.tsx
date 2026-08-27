import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { fmtDateTime } from "@/lib/dates";
import { fmtLKR } from "@/lib/constants";
import type { OrderStatusHistoryEntry, OrderWithItems } from "@/lib/types";

const STATUS_COPY: Record<string, { title: string; desc: string }> = {
  placed: {
    title: "Order placed",
    desc: "Payment is held by GiftX. Waiting for the seller to pack your gift.",
  },
  packed: {
    title: "Seller packed your gift",
    desc: "Review the photo below. Confirm if it looks right, or report an issue.",
  },
  confirmed: {
    title: "Confirmed - payment released",
    desc: "You confirmed the order. Funds have been released to the seller.",
  },
  disputed: {
    title: "Issue reported",
    desc: "This order has been flagged. Funds stay held until it is resolved.",
  },
};

const STAGES: { key: string; label: string }[] = [
  { key: "placed", label: "Placed" },
  { key: "packed", label: "Packed" },
  { key: "confirmed", label: "Confirmed" },
];

function MilestoneStepper({ status }: { status: string }) {
  if (status === "disputed") {
    return (
      <div className="my-5 flex items-center">
        {["Placed", "Packed"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            {i > 0 ? <div className="h-0.5 flex-1 bg-forest" /> : null}
            <div className="flex flex-col items-center px-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs font-extrabold text-white">
                ✓
              </div>
              <div className="mt-1.5 text-[10.5px] font-bold text-ink">{label}</div>
            </div>
          </div>
        ))}
        <div className="h-0.5 flex-1 bg-brick" />
        <div className="flex flex-col items-center px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brick text-xs font-extrabold text-white">
            !
          </div>
          <div className="mt-1.5 text-[10.5px] font-bold text-brick">Issue reported</div>
        </div>
      </div>
    );
  }

  const idx = STAGES.findIndex((s) => s.key === status);

  return (
    <div className="my-5 flex items-center">
      {STAGES.map((stage, i) => (
        <div key={stage.key} className="flex flex-1 items-center last:flex-none">
          {i > 0 ? <div className={`h-0.5 flex-1 ${i <= idx ? "bg-forest" : "bg-plum-tint"}`} /> : null}
          <div className="flex flex-col items-center px-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                i < idx
                  ? "bg-forest text-white"
                  : i === idx
                    ? "bg-plum text-white"
                    : "bg-plum-tint text-ink-soft"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <div className={`mt-1.5 text-[10.5px] font-bold ${i <= idx ? "text-ink" : "text-ink-soft"}`}>
              {stage.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [history, setHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [disputing, setDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadOrder() {
    if (!id || !user) return;
    setLoading(true);
    setError(null);
    const { signal, clear } = createTimeoutSignal();

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*, order_items(*), stores(store_name, seller_id)")
        .eq("id", id)
        .abortSignal(signal)
        .single();

      if (orderError || !orderData) {
        setError(orderError ? friendlyError(orderError.message) : "Couldn't find this order.");
        return;
      }

      const typedOrder = orderData as unknown as OrderWithItems;
      const isBuyer = typedOrder.buyer_id === user.id;
      const isSeller = typedOrder.stores?.seller_id === user.id;
      if (!isBuyer && !isSeller) {
        setError("You don't have access to view this order.");
        return;
      }

      setOrder(typedOrder);

      const { data: historyData } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true })
        .abortSignal(signal);
      setHistory(historyData ?? []);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      clear();
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function confirmOrder() {
    if (!order || !user) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", order.id);
      if (updateError) throw new Error(updateError.message);

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "confirmed",
        created_by: user.id,
        note: "Buyer confirmed the item. Payment released to seller.",
      });
      await loadOrder();
    } catch (err) {
      setActionError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setActionSubmitting(false);
    }
  }

  async function submitDispute() {
    if (!order || !user || !disputeReason.trim()) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "disputed", dispute_reason: disputeReason.trim() })
        .eq("id", order.id);
      if (updateError) throw new Error(updateError.message);

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "disputed",
        created_by: user.id,
        note: "Buyer reported an issue: " + disputeReason.trim(),
      });
      setDisputing(false);
      setDisputeReason("");
      await loadOrder();
    } catch (err) {
      setActionError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setActionSubmitting(false);
    }
  }

  if (loading) {
    return <div className="px-[6vw] py-24 text-center text-sm font-semibold text-ink-soft">Loading order…</div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-[500px] px-6 py-24 text-center">
        <span className="mb-3 block text-3xl">🎁</span>
        <p className="text-sm font-semibold text-ink-soft">{error}</p>
        <Link
          to="/orders"
          className="mt-4 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
        >
          Back to my orders
        </Link>
      </div>
    );
  }

  const isBuyer = order.buyer_id === user?.id;
  const copy = STATUS_COPY[order.status];

  return (
    <div className="mx-auto max-w-[700px] px-[6vw] py-10">
      <div className="rounded-[20px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
            Order #{order.id.slice(0, 8)} · {order.stores?.store_name}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide ${
              order.status === "confirmed"
                ? "bg-forest-tint text-forest"
                : order.status === "disputed"
                  ? "bg-brick-tint text-brick"
                  : order.status === "packed"
                    ? "bg-gold-tint text-gold-deep"
                    : "bg-plum-tint text-plum"
            }`}
          >
            {order.status}
          </span>
        </div>

        <h1 className="mt-2 font-display text-xl font-semibold text-ink">{copy.title}</h1>
        <p className="text-sm font-medium text-ink-soft">{copy.desc}</p>

        <MilestoneStepper status={order.status} />

        {order.packed_photo_url ? (
          <img
            src={order.packed_photo_url}
            alt="Packed item"
            className="mb-4 max-w-[280px] rounded-2xl border border-line"
          />
        ) : null}

        <div className="border-t border-line pt-4">
          {order.order_items.map((it) => (
            <div key={it.id} className="flex justify-between py-1 text-sm">
              <span className="font-semibold text-ink">
                {it.listing_name_snapshot} × {it.quantity}
              </span>
              <span className="font-semibold text-ink-soft">{fmtLKR(it.price_at_purchase * it.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-sm font-extrabold text-ink">
            <span>Subtotal</span>
            <span>{fmtLKR(order.subtotal)}</span>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-[12.5px] font-medium text-ink-soft">
          <div>
            {order.delivery_method === "delivery" ? `Delivery to: ${order.delivery_address}` : "Pickup from seller"}
          </div>
          {order.recipient_name ? (
            <div>
              Gift for: {order.recipient_name}
              {order.recipient_phone ? ` · ${order.recipient_phone}` : ""}
            </div>
          ) : null}
          {order.gift_message ? <div>Message: &ldquo;{order.gift_message}&rdquo;</div> : null}
          {order.delivery_flexibility === "exact" && order.requested_delivery_date ? (
            <div>Must arrive by: {order.requested_delivery_date}</div>
          ) : null}
        </div>

        {order.status === "disputed" && order.dispute_reason ? (
          <div className="mt-4 rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
            Issue: {order.dispute_reason}
          </div>
        ) : null}

        {actionError ? (
          <div className="mt-4 rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
            {actionError}
          </div>
        ) : null}

        {isBuyer && order.status === "packed" ? (
          disputing ? (
            <div className="mt-4">
              <label className="mb-2 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
                  What went wrong? This will be shown to the seller and GiftX support.
                </span>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
                />
              </label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDisputing(false)}
                  className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-ink hover:border-plum hover:text-plum"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDispute}
                  disabled={actionSubmitting || !disputeReason.trim()}
                  className="rounded-xl bg-brick px-5 py-2.5 text-sm font-bold text-white hover:bg-brick/90 disabled:opacity-60"
                >
                  {actionSubmitting ? "Submitting…" : "Submit report"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={confirmOrder}
                disabled={actionSubmitting}
                className="rounded-xl bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep disabled:opacity-60"
              >
                {actionSubmitting ? "Confirming…" : "Confirm - looks right"}
              </button>
              <button
                type="button"
                onClick={() => setDisputing(true)}
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-brick hover:border-brick"
              >
                Report an issue
              </button>
            </div>
          )
        ) : null}

        {history.length > 0 ? (
          <div className="mt-6 border-t border-line pt-4">
            {history.map((h) => (
              <div key={h.id} className="flex gap-3 py-2">
                <div className="mt-1.5 h-2 w-2 flex-none rounded-full bg-plum" />
                <div>
                  <div className="text-[13px] font-medium text-ink">{h.note || h.status}</div>
                  <div className="text-[11.5px] font-medium text-ink-soft">{fmtDateTime(h.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}