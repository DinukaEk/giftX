import { useCart } from "@/context/CartContext";

export function CartButton() {
  const { count, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-bold text-ink-soft transition-colors hover:border-plum hover:text-plum"
    >
      🛍️ Cart
      {count > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-plum px-1 text-[11px] font-extrabold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}