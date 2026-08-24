import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trophy } from "lucide-react";
import { api } from "../lib/api";

export default function BonusRequiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkBonusCompletion();
  }, []);

  const checkBonusCompletion = async () => {
    try {
      const { data: bonuses } = await api.get("/bonus/me");
      const requiredTypes = ["champion", "runner_up", "top_scorer", "best_player", "best_goalkeeper"];
      const completedTypes = new Set(bonuses.map(b => b.type));
      const allCompleted = requiredTypes.every(type => completedTypes.has(type));

      if (!allCompleted) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error checking bonus completion:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isOpen) return null;

  const handleClose = () => setIsOpen(false);

  const handleGoToBonus = () => {
    handleClose();
    navigate("/bonus");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-fade-up">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">Predicciones pendientes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Completa tus pronósticos del torneo</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-900 mb-2">
              ⏰ Plazo límite: Mañana 24 de junio
            </p>
            <p className="text-xs text-emerald-700">
              Tienes hasta mañana a las 24:00 para completar tus predicciones sobre:
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-emerald-600 font-bold mt-0.5">•</span>
              <span className="text-slate-700"><strong>Campeón</strong> del Mundial</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-emerald-600 font-bold mt-0.5">•</span>
              <span className="text-slate-700"><strong>Subcampeón</strong> del Mundial</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-emerald-600 font-bold mt-0.5">•</span>
              <span className="text-slate-700"><strong>Goleador</strong> del torneo</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-emerald-600 font-bold mt-0.5">•</span>
              <span className="text-slate-700"><strong>Mejor jugador</strong> del torneo</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-emerald-600 font-bold mt-0.5">•</span>
              <span className="text-slate-700"><strong>Mejor arquero</strong> del torneo</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 italic">
            Una vez completados, podrás acceder a ellos desde esta sección y los puntos se calcularán automáticamente al finalizar el torneo.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Después
          </button>
          <button
            onClick={handleGoToBonus}
            className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Ir a Bonus
          </button>
        </div>
      </div>
    </div>
  );
}
