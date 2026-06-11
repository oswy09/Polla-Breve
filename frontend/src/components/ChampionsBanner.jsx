import { useState } from "react";
import { api } from "../lib/api";
import usePolling from "../lib/usePolling";
import { Trophy, Users, Coins, Medal } from "lucide-react";

const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const compactCOP = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
};

export default function MundialBanner() {
  const [stats, setStats] = useState({
    participants: 0, total_collected_cop: 0, entry_fee_cop: 30000,
    prize_first_cop: 0, prize_second_cop: 0, prize_third_cop: 0,
    prize_first_pct: 50, prize_second_pct: 23, prize_third_pct: 15,
  });

  usePolling(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
  }, 20000);

  const podium = [
    { place: "1°", color: "text-yellow-500", pct: stats.prize_first_pct,  amount: stats.prize_first_cop },
    { place: "2°", color: "text-slate-400",  pct: stats.prize_second_pct, amount: stats.prize_second_cop },
    { place: "3°", color: "text-amber-600",  pct: stats.prize_third_pct,  amount: stats.prize_third_cop },
  ];

  return (
    <div className="mb-7 animate-fade-up">

      {/* ── IMAGEN BANNER (hero puro, sin overlay pesado) ── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-md"
        style={{ height: "340px" }}
      >
        <img
          src="https://res.cloudinary.com/ddqbnr9vo/image/upload/v1780443650/ChatGPT_Image_2_jun_2026_18_40_26_ih26gs.png"
          alt="Mundial 2026"
          className="w-full h-full object-cover object-center"
        />
        {/* Sombra sutil solo abajo para que el contenido de abajo tenga separación */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50/80 to-transparent" />

        {/* Badge arriba izquierda */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
            <Trophy className="w-3 h-3" /> FIFA World Cup 2026
          </span>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1 rounded-full bg-white/80 text-slate-600 border border-slate-200 backdrop-blur-sm shadow-sm">
            Jun 11 – Jul 26
          </span>
        </div>
      </div>

      {/* ── STATS (fuera del banner) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3" data-testid="champions-stats">

        {/* Cuota */}
        <div className="card-surface p-4">
          <div className="label-eyebrow mb-1">Cuota</div>
          <div className="font-display font-black text-xl text-slate-900">
            {formatCOP(stats.entry_fee_cop)}
          </div>
        </div>

        {/* Participantes */}
        <div className="card-surface p-4" data-testid="stat-participants">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <div className="label-eyebrow">Inscritos</div>
          </div>
          <div className="font-display font-black text-xl text-slate-900">{stats.participants}</div>
        </div>

        {/* Bolsa */}
        <div className="card-surface p-4 border-emerald-200 bg-emerald-50" data-testid="stat-pot">
          <div className="flex items-center gap-1.5 mb-1">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <div className="label-eyebrow text-emerald-700">Bolsa actual</div>
          </div>
          <div className="font-display font-black text-xl text-emerald-700">
            {formatCOP(stats.total_collected_cop)}
          </div>
          <div className="text-[11px] text-emerald-600/70 mt-0.5">
            {stats.participants} × {formatCOP(stats.entry_fee_cop)}
          </div>
        </div>

        {/* Premios */}
        <div className="card-surface p-4" data-testid="prize-distribution">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <div className="label-eyebrow">Distribución de Premios</div>
          </div>
          <div className="space-y-1.5 text-[11px] sm:text-xs">
            {podium.map((p, i) => (
              <div key={p.place} className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                <span className="font-semibold text-slate-500">{i + 1}° Lugar ({p.pct}%)</span>
                <span className="font-display font-black text-slate-800" data-testid={`prize-amount-${i + 1}`}>
                  {formatCOP(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
