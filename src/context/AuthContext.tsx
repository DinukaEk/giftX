import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isSeller: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Initial load — supabase-js reads the persisted session from
    // localStorage itself, this just brings it into React state.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      if (session) setProfile(await fetchProfile(session.user.id));
      setLoading(false);
    });

    // Keep state in sync with sign-in/sign-out/token-refresh events,
    // including ones triggered from another tab.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (session) {
        setProfile(await fetchProfile(session.user.id));
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session) setProfile(await fetchProfile(session.user.id));
  }

  const isSeller = profile?.role === "seller" || profile?.role === "both";

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        isSeller,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
