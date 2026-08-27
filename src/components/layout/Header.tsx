import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { CartButton } from "@/components/cart/CartButton";

export function Header() {
  const { user, profile, isSeller, signOut, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-cream/90 px-[6vw] py-4 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-plum">
        <span className="text-xl">🎀</span>
        GiftX
      </Link>

      <nav className="hidden items-center gap-6 text-[14px] font-semibold text-ink-soft sm:flex">
        <Link to="/" className="hover:text-plum">
          Marketplace
        </Link>
        <Link to="/calendar" className="hover:text-plum">
          Gift Calendar
        </Link>
        {user ? (
          <Link to="/orders" className="hover:text-plum">
            My Orders
          </Link>
        ) : null}
        {isSeller ? (
          <Link to="/dashboard" className="hover:text-plum">
            My Store
          </Link>
        ) : null}
      </nav>

      <div className="flex items-center gap-3">
        <CartButton />
        {loading ? null : user ? (
          <>
            <span className="hidden text-[13px] font-semibold text-ink-soft md:inline">
              {profile?.full_name || user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-ink-soft transition-colors hover:border-plum hover:text-plum"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="rounded-full bg-plum px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-plum-deep"
          >
            Log in / Sign up
          </Link>
        )}
      </div>
    </header>
  );
}