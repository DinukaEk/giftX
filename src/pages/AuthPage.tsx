import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type Tab = "login" | "signup";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-[10px] py-2.5 text-[13.5px] font-bold transition-colors ${
        active ? "bg-plum text-white" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum"
      />
    </label>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { user, isSeller, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>("login");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(
    null
  );

  // Already signed in (e.g. navigated here by mistake, or session restored
  // on load) — skip straight past this page.
  useEffect(() => {
    if (!authLoading && user) {
      navigate(isSeller ? "/dashboard" : "/", { replace: true });
    }
  }, [authLoading, user, isSeller, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setMessage({ text: error.message, type: "error" });
      return;
    }
    // Redirect happens via the useEffect above once AuthContext's session updates.
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!fullName.trim()) {
      setMessage({ text: "Please enter your full name.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (error) {
      setSubmitting(false);
      setMessage({ text: error.message, type: "error" });
      return;
    }

    // The DB trigger auto-creates the profile row with role='buyer' —
    // upgrade it here if they picked seller.
    if (role === "seller" && data.user) {
      await supabase.from("profiles").update({ role: "seller" }).eq("id", data.user.id);
    }

    setSubmitting(false);

    if (!data.session) {
      // Email confirmation is required on this Supabase project — no
      // session comes back yet.
      setMessage({ text: "Account created! Please log in.", type: "success" });
      setTab("login");
      return;
    }
    // Otherwise the useEffect above redirects once AuthContext picks up the session.
  }

  return (
    <div className="mx-auto max-w-[420px] px-6 py-16">
      <div className="rounded-[22px] bg-white p-7 shadow-card">
        <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">
          Welcome to GiftX
        </h1>
        <p className="mb-5 text-center text-[13px] font-medium text-ink-soft">
          Sri Lanka&rsquo;s gift marketplace
        </p>

        <div className="mb-5 flex gap-1.5 rounded-xl bg-plum-tint p-1.5">
          <TabButton
            active={tab === "login"}
            onClick={() => {
              setTab("login");
              setMessage(null);
            }}
          >
            Log in
          </TabButton>
          <TabButton
            active={tab === "signup"}
            onClick={() => {
              setTab("signup");
              setMessage(null);
            }}
          >
            Sign up
          </TabButton>
        </div>

        {message ? (
          <div
            className={`mb-4 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ${
              message.type === "error" ? "bg-brick-tint text-brick" : "bg-forest-tint text-forest"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-plum py-3 text-sm font-bold text-white transition-colors hover:bg-plum-deep disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <Field
              label="Full name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="mb-5">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
                I&rsquo;m signing up as
              </span>
              <div className="flex gap-1.5 rounded-xl bg-plum-tint p-1.5">
                <TabButton active={role === "buyer"} onClick={() => setRole("buyer")}>
                  Buyer
                </TabButton>
                <TabButton active={role === "seller"} onClick={() => setRole("seller")}>
                  Gift seller
                </TabButton>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-plum py-3 text-sm font-bold text-white transition-colors hover:bg-plum-deep disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
