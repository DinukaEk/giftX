import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal } from "@/lib/supabaseFetch";

interface Tier {
  badge: string;
  msg: string;
}

function tierFor(avgHours: number): Tier {
  if (avgHours < 2) {
    return { badge: "⚡ Lightning Packer", msg: `You pack orders in ${avgHours.toFixed(1)}h on average — top-tier speed!` };
  }
  if (avgHours < 6) {
    return {
      badge: "🚀 Fast Packer",
      msg: `Averaging ${avgHours.toFixed(1)}h to pack. Get under 2h to unlock Lightning Packer!`,
    };
  }
  if (avgHours < 24) {
    return {
      badge: "✅ Reliable Packer",
      msg: `Averaging ${avgHours.toFixed(1)}h to pack. Get under 6h to unlock Fast Packer!`,
    };
  }
  return {
    badge: "🐢 Let's pick up the pace",
    msg: `Averaging ${avgHours.toFixed(1)}h to pack. Faster packing = happier buyers and better search ranking.`,
  };
}

/** Self-contained — does its own light fetch (just id/status, then history
 *  for those ids) rather than depending on OrdersManager's internal state. */
export function MilestoneBadge({ storeId }: { storeId: string }) {
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { signal, clear } = createTimeoutSignal();

    (async () => {
      try {
        const { data: recentOrders } = await supabase
          .from("orders")
          .select("id, status")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .abortSignal(signal);

        if (cancelled) return;

        const packed = (recentOrders ?? [])
          .filter((o) => o.status === "packed" || o.status === "confirmed")
          .slice(0, 10);
        if (!packed.length) {
          setTier(null);
          return;
        }

        const { data: history } = await supabase
          .from("order_status_history")
          .select("order_id, status, created_at")
          .in(
            "order_id",
            packed.map((o) => o.id)
          )
          .abortSignal(signal);

        if (cancelled) return;

        const durations: number[] = [];
        packed.forEach((o) => {
          const placedEntry = (history ?? []).find((h) => h.order_id === o.id && h.status === "placed");
          const packedEntry = (history ?? []).find((h) => h.order_id === o.id && h.status === "packed");
          if (placedEntry && packedEntry) {
            durations.push(
              (new Date(packedEntry.created_at).getTime() - new Date(placedEntry.created_at).getTime()) / 3600000
            );
          }
        });

        if (!durations.length) {
          setTier(null);
          return;
        }
        const avgHours = durations.reduce((s, d) => s + d, 0) / durations.length;
        setTier(tierFor(avgHours));
      } catch {
        // Purely informational — skip silently on any failure.
      } finally {
        clear();
      }
    })();

    return () => {
      cancelled = true;
      clear();
    };
  }, [storeId]);

  if (!tier) return null;

  return (
    <div className="mt-6 rounded-[20px] bg-gradient-to-br from-plum to-plum-deep p-6 text-white shadow-card">
      <div className="text-xl font-extrabold">{tier.badge}</div>
      <div className="mt-1 text-[13.5px] opacity-90">{tier.msg}</div>
    </div>
  );
}