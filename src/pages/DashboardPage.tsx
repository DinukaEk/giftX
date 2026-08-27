import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { useAuth } from "@/context/AuthContext";
import { StoreForm } from "@/components/dashboard/StoreForm";
import { ListingsManager } from "@/components/dashboard/ListingsManager";
import { OrdersManager } from "@/components/dashboard/OrdersManager";
import { MilestoneBadge } from "@/components/dashboard/MilestoneBadge";
import { StockRequestsInbox } from "@/components/dashboard/StockRequestsInbox";
import type { Store } from "@/lib/types";

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const { signal, clear } = createTimeoutSignal();

    (async () => {
      try {
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("seller_id", user.id)
          .abortSignal(signal)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setError(friendlyError(error.message));
        } else {
          setStore(data);
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
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Your seller dashboard</h1>
      <p className="mb-6 text-sm font-medium text-ink-soft">
        Welcome, {profile?.full_name || user?.email}
      </p>

      {loading ? (
        <p className="text-sm font-semibold text-ink-soft">Loading…</p>
      ) : error ? (
        <div className="rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">{error}</div>
      ) : (
        <>
          <StoreForm store={store} onSaved={setStore} />
          {store ? (
            <>
              <MilestoneBadge storeId={store.id} />
              <ListingsManager storeId={store.id} />
              <OrdersManager storeId={store.id} />
              <StockRequestsInbox storeId={store.id} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}