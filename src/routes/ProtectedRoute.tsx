import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({
  children,
  requireSeller = false,
}: {
  children: React.ReactNode;
  requireSeller?: boolean;
}) {
  const { user, isSeller, loading } = useAuth();

  // Auth state loads once, briefly, on first paint — wait for it rather than
  // flashing a redirect to a user who's actually signed in.
  if (loading) return null;

  if (!user) return <Navigate to="/auth" replace />;
  if (requireSeller && !isSeller) return <Navigate to="/" replace />;

  return <>{children}</>;
}
