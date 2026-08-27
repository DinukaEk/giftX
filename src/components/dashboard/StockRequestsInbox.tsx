import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createTimeoutSignal, friendlyError } from "@/lib/supabaseFetch";
import type { StockRequest } from "@/lib/types";

function StockRequestRow({ request, onChanged }: { request: StockRequest; onChanged: () => void }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("stock_requests")
        .update({ status: "responded", seller_reply: replyText.trim() })
        .eq("id", request.id);
      if (updateError) throw new Error(updateError.message);
      onChanged();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  async function markClosed() {
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("stock_requests")
        .update({ status: "closed" })
        .eq("id", request.id);
      if (updateError) throw new Error(updateError.message);
      onChanged();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-b border-line py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[13.5px] font-bold text-ink">
            {request.listing_name_snapshot ?? "A listing"} — wants {request.requested_quantity}
          </div>
          {request.message ? (
            <div className="text-[12.5px] font-medium text-ink-soft">&ldquo;{request.message}&rdquo;</div>
          ) : null}
          {request.status === "responded" && request.seller_reply ? (
            <div className="mt-1 text-[12.5px] font-semibold text-forest">You replied: {request.seller_reply}</div>
          ) : null}
        </div>

        {request.status === "open" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className="rounded-full bg-plum px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-plum-deep"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={markClosed}
              disabled={submitting}
              className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-ink-soft hover:border-plum hover:text-plum disabled:opacity-60"
            >
              Can&rsquo;t fulfil
            </button>
          </div>
        ) : (
          <span className="rounded-full bg-plum-tint px-2.5 py-1 text-[10.5px] font-extrabold uppercase text-plum">
            {request.status}
          </span>
        )}
      </div>

      {error ? (
        <div className="mt-2 rounded-lg bg-brick-tint px-3 py-2 text-[12.5px] font-semibold text-brick">{error}</div>
      ) : null}

      {replying ? (
        <div className="mt-3 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="e.g. Can do 5 more by Friday"
            className="flex-1 rounded-xl border border-line bg-white px-3.5 py-2 text-sm outline-none focus:border-plum"
          />
          <button
            type="button"
            onClick={sendReply}
            disabled={submitting || !replyText.trim()}
            className="rounded-xl bg-plum px-4 py-2 text-sm font-bold text-white hover:bg-plum-deep disabled:opacity-60"
          >
            Send
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function StockRequestsInbox({ storeId }: { storeId: string }) {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    setError(null);
    const { signal, clear } = createTimeoutSignal();
    try {
      const { data, error } = await supabase
        .from("stock_requests")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .abortSignal(signal);

      if (error) throw new Error(error.message);
      setRequests((data as StockRequest[]) ?? []);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      clear();
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // Nothing to show, nothing pending — don't take up space on the dashboard.
  if (!loading && !error && requests.length === 0) return null;

  return (
    <div className="mt-6 rounded-[20px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">Stock requests</h2>

      {error ? (
        <div className="mb-4 rounded-lg bg-brick-tint px-3.5 py-2.5 text-[13px] font-semibold text-brick">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-4 text-center text-sm font-semibold text-ink-soft">Loading…</p>
      ) : (
        <div>
          {requests.map((r) => (
            <StockRequestRow key={r.id} request={r} onChanged={loadRequests} />
          ))}
        </div>
      )}
    </div>
  );
}