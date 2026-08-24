import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { formatApiError } from "./api";
import { requireSupabaseEnv, supabase } from "./supabase";

const AuthContext = createContext(null);

function getAuthErrorMessage(error) {
  return (
    error?.response?.data?.detail ??
    error?.message ??
    error?.error_description ??
    error?.error ??
    null
  );
}

async function loadProfile() {
  requireSupabaseEnv();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authUser) return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, role, paid, active, avatar_url")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.active === false) return false;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email || authUser.email,
    role: profile.role || "user",
    paid: Boolean(profile.paid),
    avatar_url: profile.avatar_url || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=anon, object=auth
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const profile = await loadProfile();
      setUser(profile || false);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchMe();
    });

    return () => subscription.unsubscribe();
  }, [fetchMe]);

  const login = async (email, password) => {
    try {
      requireSupabaseEnv();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await loadProfile();
      setUser(profile || false);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(getAuthErrorMessage(e)) };
    }
  };

  const register = async (name, email, password) => {
    try {
      requireSupabaseEnv();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("No se pudo crear la cuenta");

      // Profile is created by DB trigger (handle_new_user). Avoid client-side upsert here.
      // If email confirmation is enabled in Supabase, session can be null until confirmation.
      if (data.session) {
        const profile = await loadProfile();
        setUser(profile || false);
      } else {
        setUser(false);
      }

      return { ok: true };
    } catch (e) {
      const rawMessage = getAuthErrorMessage(e);
      if (typeof rawMessage === "string" && rawMessage.includes("body stream already read")) {
        return {
          ok: false,
          error: "No se pudo completar el registro. Revisa Supabase Auth (Email confirmations) o intenta de nuevo en unos segundos.",
        };
      }
      return { ok: false, error: formatApiError(rawMessage) };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
