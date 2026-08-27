import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import { fmtLKR } from "@/lib/constants";
import type { DeliveryFlexibility, FulfillmentType, Recipient } from "@/lib/types";

interface SendGiftListing {
  id: string;
  name: string;
  price: number;
  photo: string | null;
  storeId: string;
  storeName: string;
  storeOffersDelivery: boolean;
  storeOffersPickup: boolean;
  fulfillmentType: FulfillmentType;
  quantityAvailable: number | null;
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
      />
    </label>
  );
}

export function SendGiftModal({ listing }: { listing: SendGiftListing }) {
  const { user } = useAuth();
  const { addItem, openCart } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "stockRequest" | "success" | "stockRequestSent">("form");

  const [savedRecipients, setSavedRecipients] = useState<Recipient[]>([]);
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const [saveContact, setSaveContact] = useState(true);

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [deliveryFlexibility, setDeliveryFlexibility] = useState<DeliveryFlexibility>("flexible");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [stockNote, setStockNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setRecipientName("");
    setRecipientPhone("");
    setRecipientAddress("");
    setQuantity(1);
    setDeliveryFlexibility("flexible");
    setDeliveryDate("");
    setGiftMessage("");
    setStockNote("");
    setMatchedId(null);
    setSaveContact(true);
    setError(null);
    setStep("form");
  }

  async function open() {
    setIsOpen(true);
    if (!user) return;
    const { signal, clear } = createTimeoutSignal();
    try {
      const { data } = await supabase
        .from("recipients")
        .select("*")
        .eq("user_id", user.id)
        .order("name")
        .abortSignal(signal);
      setSavedRecipients(data ?? []);
    } catch {
      // Autocomplete is a convenience — fail silently and let the person type manually.
    } finally {
      clear();
    }
  }

  function close() {
    setIsOpen(false);
    resetForm();
  }

  function handleNameChange(value: string) {
    setRecipientName(value);
    const match = savedRecipients.find((r) => r.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setRecipientPhone(match.phone);
      setRecipientAddress(match.address || "");
      setMatchedId(match.id);
    } else {
      setMatchedId(null);
    }
  }

  function validate(): string | null {
    if (!recipientName.trim() || !recipientPhone.trim()) {
      return "Please fill in the recipient's name and phone number.";
    }
    if (deliveryFlexibility === "exact" && !deliveryDate) {
      return "Please choose the date this needs to arrive by.";
    }
    return null;
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const overStock =
      listing.fulfillmentType === "in_stock" &&
      listing.quantityAvailable != null &&
      quantity > listing.quantityAvailable;

    if (overStock) {
      setStep("stockRequest");
    } else {
      void finalizeAdd();
    }
  }

  async function finalizeAdd() {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      let recipientId = matchedId;
      if (saveContact) {
        if (matchedId) {
          await supabase
            .from("recipients")
            .update({ phone: recipientPhone, address: recipientAddress || null })
            .eq("id", matchedId);
        } else {
          const { data } = await supabase
            .from("recipients")
            .insert({
              user_id: user.id,
              name: recipientName,
              phone: recipientPhone,
              address: recipientAddress || null,
            })
            .select()
            .single();
          if (data) recipientId = data.id;
        }
      }

      addItem({
        listingId: listing.id,
        listingName: listing.name,
        listingPrice: listing.price,
        photo: listing.photo,
        storeId: listing.storeId,
        storeName: listing.storeName,
        storeOffersDelivery: listing.storeOffersDelivery,
        storeOffersPickup: listing.storeOffersPickup,
        fulfillmentType: listing.fulfillmentType,
        recipientId,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientAddress: recipientAddress.trim(),
        quantity,
        deliveryFlexibility,
        requestedDeliveryDate: deliveryFlexibility === "exact" ? deliveryDate : null,
        giftMessage: giftMessage.trim() || null,
      });
      setStep("success");
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestStock() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: reqError } = await supabase.from("stock_requests").insert({
        listing_id: listing.id,
        listing_name_snapshot: listing.name,
        store_id: listing.storeId,
        buyer_id: user.id,
        requested_quantity: quantity,
        message: stockNote.trim() || null,
      });
      if (reqError) throw new Error(reqError.message);
      setStep("stockRequestSent");
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="w-full rounded-xl bg-plum py-3 text-sm font-bold text-white transition-colors hover:bg-plum-deep"
      >
        Send this gift
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={close} aria-hidden className="absolute inset-0 bg-plum-deep/30 backdrop-blur-[2px]" />

          <div className="relative max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-[20px] bg-white p-6 shadow-card-lg">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-plum-tint hover:text-plum"
            >
              ✕
            </button>

            {!user ? (
              <div className="pt-2 text-center">
                <span className="mb-3 block text-3xl">🎁</span>
                <h2 className="mb-1 font-display text-lg font-semibold text-ink">Log in to send a gift</h2>
                <p className="mb-5 text-sm text-ink-soft">
                  We&rsquo;ll need an account to keep track of your recipient and order.
                </p>
                <Link
                  to="/auth"
                  onClick={close}
                  className="inline-block rounded-xl bg-plum px-6 py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
                >
                  Log in / Sign up
                </Link>
              </div>
            ) : step === "success" ? (
              <div className="pt-2 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-forest-tint text-2xl">
                  🎉
                </div>
                <h2 className="mb-1 font-display text-lg font-semibold text-ink">Added to your cart</h2>
                <p className="mb-5 text-sm text-ink-soft">{recipientName}&rsquo;s gift is ready to send.</p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-xl border border-line py-2.5 text-sm font-bold text-ink hover:border-plum hover:text-plum"
                  >
                    Continue shopping
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      openCart();
                    }}
                    className="flex-1 rounded-xl bg-plum py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
                  >
                    View cart
                  </button>
                </div>
              </div>
            ) : step === "stockRequestSent" ? (
              <div className="pt-2 text-center">
                <span className="mb-3 block text-3xl">📨</span>
                <h2 className="mb-1 font-display text-lg font-semibold text-ink">Request sent!</h2>
                <p className="mb-5 text-sm text-ink-soft">
                  The seller will get back to you about fulfilling {quantity} of this item.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-xl bg-plum py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
                >
                  Close
                </button>
              </div>
            ) : step === "stockRequest" ? (
              <div>
                <h2 className="mb-1 pr-8 font-display text-lg font-semibold text-ink">Only a few left</h2>
                <p className="mb-4 text-sm text-ink-soft">
                  Only {listing.quantityAvailable} left in stock, but this needs {quantity}. You can ask the
                  seller to fulfill the rest instead.
                </p>

                {error ? (
                  <div className="mb-4 rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
                    {error}
                  </div>
                ) : null}

                <label className="mb-4 block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
                    Note to the seller (optional)
                  </span>
                  <textarea
                    value={stockNote}
                    onChange={(e) => setStockNote(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
                  />
                </label>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="flex-1 rounded-xl border border-line py-2.5 text-sm font-bold text-ink hover:border-plum hover:text-plum"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={requestStock}
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-plum py-2.5 text-sm font-bold text-white hover:bg-plum-deep disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Ask the seller"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContinue}>
                <h2 className="mb-1 pr-8 font-display text-lg font-semibold leading-tight text-ink">
                  Send &ldquo;{listing.name}&rdquo;
                </h2>
                <p className="mb-4 text-[13px] font-semibold text-ink-soft">Who&rsquo;s this for?</p>

                {error ? (
                  <div className="mb-4 rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
                    {error}
                  </div>
                ) : null}

                <label className="mb-3.5 block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Recipient name</span>
                  <input
                    list="recipient-suggestions"
                    value={recipientName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
                  />
                  <datalist id="recipient-suggestions">
                    {savedRecipients.map((r) => (
                      <option key={r.id} value={r.name} />
                    ))}
                  </datalist>
                  {matchedId ? (
                    <span className="mt-1 inline-block rounded-full bg-forest-tint px-2 py-0.5 text-[10.5px] font-bold text-forest">
                      Saved contact
                    </span>
                  ) : null}
                </label>

                <Field
                  label="Phone"
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
                <Field
                  label="Address (if delivery needed)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />

                <label className="mb-4 flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
                  <input
                    type="checkbox"
                    checked={saveContact}
                    onChange={(e) => setSaveContact(e.target.checked)}
                    className="h-4 w-4 rounded border-line accent-plum"
                  />
                  {matchedId ? "Update this saved contact" : "Save this contact for next time"}
                </label>

                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink-soft">Quantity</span>
                  <div className="flex items-center gap-2 rounded-full bg-plum-tint px-1 py-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-plum hover:bg-white"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-plum hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
                    When does this need to arrive?
                  </span>
                  <div className="flex gap-1.5 rounded-xl bg-plum-tint p-1.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryFlexibility("flexible")}
                      className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
                        deliveryFlexibility === "flexible" ? "bg-plum text-white" : "text-ink-soft"
                      }`}
                    >
                      Any time is fine
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFlexibility("exact")}
                      className={`flex-1 rounded-[9px] py-2 text-[12.5px] font-bold ${
                        deliveryFlexibility === "exact" ? "bg-plum text-white" : "text-ink-soft"
                      }`}
                    >
                      Specific date
                    </button>
                  </div>
                  {deliveryFlexibility === "exact" ? (
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
                    />
                  ) : null}
                </div>

                <label className="mb-5 block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
                    Gift message (optional)
                  </span>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-plum"
                  />
                </label>

                <div className="mb-4 flex items-center justify-between rounded-xl bg-plum-tint px-4 py-3">
                  <span className="text-[13px] font-bold text-ink">
                    Total ({quantity} item{quantity === 1 ? "" : "s"})
                  </span>
                  <span className="text-[15px] font-extrabold text-plum">
                    {fmtLKR(listing.price * quantity)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-plum py-3 text-sm font-bold text-white hover:bg-plum-deep disabled:opacity-60"
                >
                  {submitting ? "Adding…" : "Continue"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}