import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Lock } from "lucide-react";

export default function Protected({ children, adminOnly = false, allowLocalPreview = false }) {
  const { user, loading, logout } = useAuth();
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [tournamentStarted, setTournamentStarted] = useState(false);

  const isLocalAdminPreview =
    allowLocalPreview &&
    typeof window !== "undefined" &&
    window.location.hostname === "localhost" &&
    new URLSearchParams(window.location.search).get("localPreview") === "1";

  useEffect(() => {
    if (user && user.role !== "admin" && !user.paid && !isLocalAdminPreview) {
      setCheckingPayment(true);
      api.get("/matches")
        .then(({ data }) => {
          if (data && data.length > 0) {
            const earliest = new Date(data[0].match_date);
            if (new Date() >= earliest) {
              setTournamentStarted(true);
            }
          }
        })
        .catch((e) => console.error("Error checking matches in Protected", e))
        .finally(() => setCheckingPayment(false));
    }
  }, [user, isLocalAdminPreview]);

  if (loading || checkingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Cargando…</div>
      </div>
    );
  }

  if (!user && !isLocalAdminPreview) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== "admin" && !isLocalAdminPreview) return <Navigate to="/" replace />;

  if (tournamentStarted && user && user.role !== "admin" && !user.paid && !isLocalAdminPreview) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 card-surface p-8 border-rose-200 bg-rose-50/10">
          <div className="w-16 h-16 bg-rose-100 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-2xl text-slate-900">Acceso Bloqueado</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            No has realizado el pago de la inscripción a la Polla antes del inicio del primer partido.
            De acuerdo con las reglas, tu cuenta ha sido bloqueada, tus pronósticos no son válidos y no puedes interactuar.
          </p>
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 mb-4">
              Si ya pagaste, por favor contacta al administrador para que valide tu estado.
            </p>
            <button
              onClick={async () => {
                await logout();
                window.location.href = "/login";
              }}
              className="btn-primary bg-rose-600 hover:bg-rose-700 text-white text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
