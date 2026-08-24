import { X, Share, SquarePlus } from "lucide-react";

export default function IosInstallModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-display font-bold text-lg text-slate-900">
            Activa las notificaciones en iPhone
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          En iPhone, Safari solo permite notificaciones si agregas Polla Breve a tu pantalla de inicio (como una app). Son 3 pasos, una sola vez:
        </p>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">1</span>
            <p className="text-slate-700 flex items-center gap-1.5 flex-wrap">
              Toca el botón de compartir <Share className="w-4 h-4 text-blue-500 inline" /> en la barra de Safari.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">2</span>
            <p className="text-slate-700 flex items-center gap-1.5 flex-wrap">
              Busca y toca <strong>"Agregar a pantalla de inicio"</strong> <SquarePlus className="w-4 h-4 text-slate-500 inline" />.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">3</span>
            <p className="text-slate-700">
              Abre <strong>Polla Breve desde ese ícono nuevo</strong> (no desde Safari) y ahí sí toca la campana 🔔 para activar.
            </p>
          </div>
        </div>
        <button onClick={onClose} className="btn-primary w-full mt-5 text-sm">
          Entendido
        </button>
      </div>
    </div>
  );
}
