import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { fmtLKR } from "@/lib/constants";
import type { OrderWithItems } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  placed: "bg-plum-tint text-plum",
  packed: "bg-gold-tint text-gold-deep",
  confirmed: "bg-forest-tint text-forest",
  disputed: "bg-brick-tint text-brick",
};

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const { signal, clear } = createTimeoutSignal();

    (async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*), stores(store_name, seller_id)")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .abortSignal(signal);

        if (cancelled) return;
        if (error) {
          setError(friendlyError(error.message));
        } else {
          setOrders((data as unknown as OrderWithItems[]) ?? []);
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
  }, [user]);

  return (
    <div className="mx-auto max-w-[760px] px-[6vw] py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink">My orders</h1>

      {loading ? (
        <p className="text-sm font-semibold text-ink-soft">Loading…</p>
      ) : error ? (
        <div className="rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">{error}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-[20px] bg-white p-8 text-center shadow-card ring-1 ring-black/[0.03]">
          <span className="mb-2 block text-2xl">🎁</span>
          <p className="mb-4 text-sm font-semibold text-ink-soft">
            No orders yet. Head to the marketplace to send your first gift.
          </p>
          <Link
            to="/"
            className="inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
          >
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <div className="rounded-[20px] bg-white p-2 shadow-card ring-1 ring-black/[0.03]">
          {orders.map((o) => (
            <Link
              key={o.id}
              to={`/orders/${o.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 hover:bg-plum-tint/40"
            >
              <div>
                <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  {o.stores?.store_name}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_BADGE[o.status]}`}
                  >
                    {o.status}
                  </span>
                </div>
                <div className="text-[12.5px] font-medium text-ink-soft">
                  {o.order_items.map((it) => `${it.listing_name_snapshot} × ${it.quantity}`).join(", ")} ·{" "}
                  {fmtLKR(o.subtotal)}
                </div>
                {o.recipient_name ? (
                  <div className="text-[12px] font-medium text-ink-soft">To {o.recipient_name}</div>
                ) : null}
              </div>
              <span className="flex-none text-[13px] font-bold text-plum">View →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}