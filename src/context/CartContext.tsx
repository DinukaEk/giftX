import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "giftx_gift_cart";

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  count: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Plain SPA, no server-render pass — a simple lazy initializer is fine
  // here (unlike the SSR-safe useSyncExternalStore pattern needed in the
  // Next.js version of this project).
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(item: Omit<CartItem, "cartItemId">) {
    const cartItemId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev, { ...item, cartItemId }]);
  }

  function removeItem(cartItemId: string) {
    setItems((prev) => prev.filter((it) => it.cartItemId !== cartItemId));
  }

  function clearCart() {
    setItems([]);
  }

  const count = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.listingPrice * it.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        removeItem,
        clearCart,
        count,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}