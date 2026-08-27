import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { fmtLKR } from "@/lib/constants";
import type { CartItem, DeliveryMethod } from "@/lib/types";

type StoreGroup = {
  storeId: string;
  storeName: string;
  items: CartItem[];
  offersDelivery: boolean;
  offersPickup: boolean;
};

function groupByStore(items: CartItem[]): StoreGroup[] {
  const map = new Map<string, StoreGroup>();
  for (const it of items) {
    const existing = map.get(it.storeId);
    if (existing) {
      existing.items.push(it);
    } else {
      map.set(it.storeId, {
        storeId: it.storeId,
        storeName: it.storeName,
        items: [it],
        offersDelivery: it.storeOffersDelivery,
        offersPickup: it.storeOffersPickup,
      });
    }
  }
  return [...map.values()];
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"cart" | "checkout">("cart");
  const [deliveryMethods, setDeliveryMethods] = useState<Record<string, DeliveryMethod>>({});
  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const storeGroups = groupByStore(items);

  function handleClose() {
    closeCart();
    setTimeout(() => {
      setMode("cart");
      setCheckoutError(null);
    }, 300);
  }

  function goToCheckout() {
    if (!user) {
      navigate("/auth");
      closeCart();
      return;
    }
    const defaults: Record<string, DeliveryMethod> = {};
    for (const g of storeGroups) {
      defaults[g.storeId] = g.offersDelivery ? "delivery" : "pickup";
    }
    setDeliveryMethods(defaults);
    setCheckoutError(null);
    setMode("checkout");
  }

  async function placeOrder() {
    if (!user) return;
    setCheckoutError(null);

    for (const group of storeGroups) {
      const method = deliveryMethods[group.storeId];
      if (method === "delivery") {
        const missing = group.items.find((it) => !it.recipientAddress.trim());
        if (missing) {
          setCheckoutError(
            `Please add a delivery address for ${missing.recipientName} — remove that item and re-add it from the listing with an address, or switch ${group.storeName} to pickup.`
          );
          return;
        }
      }
    }

    setPlacing(true);
    const createdOrderIds: string[] = [];

    try {
      for (const group of storeGroups) {
        const method = deliveryMethods[group.storeId];

        for (const it of group.items) {
          const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
              buyer_id: user.id,
              store_id: group.storeId,
              subtotal: it.listingPrice * it.quantity,
              delivery_method: method,
              delivery_address: method === "delivery" ? it.recipientAddress : null,
              recipient_id: it.recipientId,
              recipient_name: it.recipientName,
              recipient_phone: it.recipientPhone,
              gift_message: it.giftMessage,
              requested_delivery_date: it.requestedDeliveryDate,
              delivery_flexibility: it.deliveryFlexibility,
              status: "placed",
            })
            .select()
            .single();

          if (orderError || !order) {
            throw new Error(orderError?.message || "Could not create an order.");
          }

          const { error: itemError } = await supabase.from("order_items").insert({
            order_id: order.id,
            listing_id: it.listingId,
            listing_name_snapshot: it.listingName,
            quantity: it.quantity,
            price_at_purchase: it.listingPrice,
          });
          if (itemError) throw new Error(itemError.message);

          const { error: historyError } = await supabase.from("order_status_history").insert({
            order_id: order.id,
            status: "placed",
            created_by: user.id,
            note: "Order placed. Payment held until you confirm.",
          });
          if (historyError) throw new Error(historyError.message);

          createdOrderIds.push(order.id);
        }
      }

      clearCart();
      closeCart();
      navigate(createdOrderIds.length === 1 ? `/orders/${createdOrderIds[0]}` : "/orders");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong placing your order.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <div
        onClick={handleClose}
        aria-hidden
        className={`fixed inset-0 z-[90] bg-plum-deep/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-label="Gift cart"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-[95] flex w-full max-w-[420px] flex-col rounded-l-[22px] bg-white shadow-card-lg transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            {mode === "cart" ? "Your gift cart" : "Checkout"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-plum-tint hover:text-plum"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {mode === "cart" ? (
            items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-plum-tint text-2xl">
                  🎁
                </div>
                <p className="text-sm font-semibold text-ink-soft">
                  Your cart is empty — click &ldquo;Send this gift&rdquo; on a listing to get started.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {items.map((it) => (
                  <li key={it.cartItemId} className="flex gap-3 border-b border-line pb-4 last:border-b-0">
                    <div className="relative h-16 w-16 flex-none overflow-hidden rounded-xl bg-plum-tint">
                      {it.photo ? (
                        <img src={it.photo} alt={it.listingName} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13.5px] font-bold leading-tight text-ink">
                          {it.listingName} × {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(it.cartItemId)}
                          aria-label={`Remove ${it.listingName}`}
                          className="flex-none text-ink-soft hover:text-brick"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="text-[12px] font-semibold text-ink-soft">
                        To {it.recipientName} · by {it.storeName}
                      </span>
                      {it.deliveryFlexibility === "exact" ? (
                        <span className="text-[11.5px] text-ink-soft">
                          Must arrive by {it.requestedDeliveryDate}
                        </span>
                      ) : null}
                      <span className="mt-1 text-[13.5px] font-extrabold text-plum">
                        {fmtLKR(it.listingPrice * it.quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="flex flex-col gap-4">
              {storeGroups.map((group) => (
                <div key={group.storeId} className="rounded-2xl border border-line p-4">
                  <h4 className="mb-1 text-[13.5px] font-bold text-ink">{group.storeName}</h4>
                  <p className="mb-3 text-[12px] font-medium text-ink-soft">
                    {group.items.length} gift{group.items.length > 1 ? "s" : ""} from this seller —{" "}
                    {group.items.map((i) => i.recipientName).join(", ")}
                  </p>
                  <div className="flex gap-1.5 rounded-xl bg-plum-tint p-1.5">
                    {group.offersDelivery ? (
                      <button
                        type="button"
                        onClick={() => setDeliveryMethods((prev) => ({ ...prev, [group.storeId]: "delivery" }))}
                        className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
                          deliveryMethods[group.storeId] === "delivery" ? "bg-plum text-white" : "text-ink-soft"
                        }`}
                      >
                        Delivery
                      </button>
                    ) : null}
                    {group.offersPickup ? (
                      <button
                        type="button"
                        onClick={() => setDeliveryMethods((prev) => ({ ...prev, [group.storeId]: "pickup" }))}
                        className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
                          deliveryMethods[group.storeId] === "pickup" ? "bg-plum text-white" : "text-ink-soft"
                        }`}
                      >
                        Pickup
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {checkoutError ? (
                <div className="rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
                  {checkoutError}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="border-t border-line px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">Subtotal</span>
              <span className="text-lg font-extrabold text-ink">{fmtLKR(subtotal)}</span>
            </div>
            {mode === "cart" ? (
              <button
                type="button"
                onClick={goToCheckout}
                className="w-full rounded-xl bg-plum py-3 text-sm font-bold text-white transition-colors hover:bg-plum-deep"
              >
                {user ? "Checkout" : "Log in to checkout"}
              </button>
            ) : (
              <button
                type="button"
                onClick={placeOrder}
                disabled={placing}
                className="w-full rounded-xl bg-plum py-3 text-sm font-bold text-white transition-colors hover:bg-plum-deep disabled:opacity-60"
              >
                {placing ? "Placing order…" : "Place order"}
              </button>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}