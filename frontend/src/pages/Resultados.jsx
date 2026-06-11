import { useState } from "react";
import { api, formatDate, getInitials } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ChevronDown, ChevronUp, Trophy, Medal, Minus } from "lucide-react";
import usePolling from "../lib/usePolling";

const POINT_BADGE = {
  3: { label: "Exacto",      cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  2: { label: "Ganador",     cls: "bg-blue-50 border-blue-200 text-blue-700" },
  1: { label: "Parcial",     cls: "bg-amber-50 border-amber-200 text-amber-700" },
  0: { label: "Sin acierto", cls: "bg-slate-50 border-slate-200 text-slate-500" },
};

function PointsBadge({ pts }) {
  if (pts == null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400">
        <Minus className="w-3 h-3" /> Sin pronóstico
      </span>
    );
  }
  const cfg = POINT_BADGE[pts] || POINT_BADGE[0];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <Trophy className="w-3 h-3" /> {cfg.label} · {pts} pt
    </span>
  );
}

function ResultRow({ row }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [leaders, setLeaders] = useState(null);
  const [loadingL, setLoadingL] = useState(false);
  const m = row.match;
  const pred = row.my_prediction;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && leaders == null) {
      setLoadingL(true);
      try {
        const { data } = await api.get(`/matches/${m.id}/leaderboard`);
        setLeaders(data);
      } finally {
        setLoadingL(false);
      }
    }
  };

  return (
    <div className="card-surface overflow-hidden animate-fade-up" data-testid={`result-row-${m.id}`}>
      <button
        type="button"
        onClick={toggle}
        className="w-full text-left p-4 sm:p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors"
        data-testid={`result-toggle-${m.id}`}
      >
        <div className="hidden sm:flex flex-col items-start min-w-[130px]">
          <span className="label-eyebrow">{m.group_name ? `Grupo ${m.group_name}` : m.ronda || ""}</span>
          {m.status !== "finalized" ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 mt-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span> En vivo
            </span>
          ) : (
            <span className="text-xs text-slate-400 mt-1">{formatDate(m.match_date)}</span>
          )}
        </div>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          {m.logo_home ? (
            <img src={m.logo_home} alt={m.home_team} className="w-9 h-9 object-contain shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
              {m.home_team.slice(0,2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate text-slate-800 text-sm">{m.home_team}</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-300 text-xs">vs</span>
              {m.status !== "finalized" && (
                <span className="inline-flex sm:hidden items-center gap-1 text-[9px] font-bold text-rose-600 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> EN VIVO
                </span>
              )}
            </div>
            <div className="font-semibold truncate text-slate-800 text-sm">{m.away_team}</div>
          </div>
          {m.logo_away ? (
            <img src={m.logo_away} alt={m.away_team} className="w-9 h-9 object-contain shrink-0 ml-auto" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 ml-auto">
              {m.away_team.slice(0,2)}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col items-center min-w-[90px]">
          <span className="label-eyebrow">Real</span>
          <span className="font-display font-black text-xl text-slate-900 mt-0.5">
            {m.home_score}<span className="text-slate-300 mx-0.5">–</span>{m.away_score}
          </span>
        </div>

        <div className="hidden md:flex flex-col items-center min-w-[90px]">
          <span className="label-eyebrow">Tu pick</span>
          <span className={`font-display font-black text-xl mt-0.5 ${pred ? "text-emerald-700" : "text-slate-300"}`}>
            {pred ? `${pred.pred_home} – ${pred.pred_away}` : "—"}
          </span>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[110px]">
          <PointsBadge pts={row.my_points} />
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </div>
      </button>

      <div className="md:hidden px-4 pb-4 -mt-1 grid grid-cols-2 gap-2 text-center">
        <div className="bg-slate-50 rounded-lg py-2 border border-slate-200">
          <div className="label-eyebrow">Real</div>
          <div className="font-display font-black text-lg text-slate-900">{m.home_score} – {m.away_score}</div>
        </div>
        <div className="bg-slate-50 rounded-lg py-2 border border-slate-200">
          <div className="label-eyebrow">Tu pick</div>
          <div className={`font-display font-black text-lg ${pred ? "text-emerald-700" : "text-slate-300"}`}>
            {pred ? `${pred.pred_home} – ${pred.pred_away}` : "—"}
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 sm:px-5 py-4 bg-slate-50" data-testid={`result-leaderboard-${m.id}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="label-eyebrow">Todos los pronósticos en este partido</span>
          </div>
          {loadingL ? (
            <div className="text-slate-400 text-sm">Cargando…</div>
          ) : !leaders || leaders.length === 0 ? (
            <div className="text-slate-400 text-sm">Sin pronósticos registrados.</div>
          ) : (
            <ul className="space-y-1.5">
              {leaders.map((u, i) => {
                const isMe = user && user.id === u.user_id;
                const podium = i < 3 ? ["text-yellow-500", "text-slate-400", "text-amber-600"][i] : "";
                return (
                  <li
                    key={u.user_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isMe ? "row-highlight" : "bg-white hover:bg-slate-50"}`}
                  >
                    <div className="w-5 text-center font-display font-black flex items-center justify-center">
                      {i < 3
                        ? <Medal className={`w-4 h-4 ${podium}`} />
                        : <span className="text-slate-400 text-xs">{i + 1}</span>
                      }
                    </div>
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0 truncate font-semibold text-slate-800">
                      {u.name}
                      {isMe && <span className="text-emerald-600 text-xs ml-1">(tú)</span>}
                    </div>
                    <span className="font-display font-bold text-slate-600 text-sm">
                      {u.pred_home} – {u.pred_away}
                    </span>
                    <PointsBadge pts={u.points} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Resultados() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  usePolling(async () => {
    try {
      const { data } = await api.get("/results");
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, 20000);

  const totalPts = rows.reduce((s, r) => s + (r.my_points || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-7 animate-fade-up flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="label-eyebrow">Resultados</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-1 tracking-tight text-slate-900">
            Tus picks vs la realidad
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Aparecen los partidos en vivo y finalizados. Toca para ver el top 5.
          </p>
        </div>
        {rows.length > 0 && (
          <div className="card-surface px-4 py-2.5 flex items-center gap-2" data-testid="results-total">
            <span className="label-eyebrow">Total</span>
            <span className="font-display font-black text-2xl text-emerald-600">{totalPts}</span>
            <span className="text-xs text-slate-400">pts</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-slate-400 py-8">Cargando resultados…</div>
      ) : rows.length === 0 ? (
        <div className="card-surface p-8 text-center text-slate-400">
          Aún no hay partidos finalizados. Vuelve cuando se cierre el primer encuentro.
        </div>
      ) : (
        <div className="space-y-3" data-testid="results-list">
          {rows.map((r) => <ResultRow key={r.match.id} row={r} />)}
        </div>
      )}
    </div>
  );
}
