import { useState, useEffect, useRef } from "react";
import { api, getInitials, formatDate } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Trophy, Medal, X, Star, Award, Shield, User, Calendar, Sparkles, ChevronDown, List, Mountain } from "lucide-react";

const BURRO_IMG = "https://res.cloudinary.com/ddqbnr9vo/image/upload/v1782243425/burroo-removebg-preview_vtdy1k.png";
import usePolling from "../lib/usePolling";
import useRealtimeMatches from "../lib/useRealtimeMatches";

function PointsBadge({ pts }) {
  if (pts == null) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400 shrink-0">
        Sin pick
      </span>
    );
  }
  const POINT_BADGE = {
    3: { label: "Exacto",      cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    2: { label: "Ganador",     cls: "bg-blue-50 border-blue-200 text-blue-700" },
    1: { label: "Parcial",     cls: "bg-amber-50 border-amber-200 text-amber-700" },
    0: { label: "Sin acierto", cls: "bg-slate-50 border-slate-200 text-slate-500" },
  };
  const cfg = POINT_BADGE[pts] || POINT_BADGE[0];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.cls}`}>
      {cfg.label} · {pts} pt
    </span>
  );
}

function UserTransparencyModal({ user, onClose, onRefreshPoints }) {
  const [tab, setTab] = useState("predictions"); // "predictions" | "bonus" | "trivia"
  const [predictions, setPredictions] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [trivias, setTrivias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [livePoints, setLivePoints] = useState(user?.points ?? 0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.get(`/users/${user.user_id}/predictions`),
      api.get(`/users/${user.user_id}/bonus`),
      api.get(`/users/${user.user_id}/trivia`),
      api.get("/ranking"),
    ])
      .then(([{ data: pData }, { data: bData }, { data: tData }, { data: rankData }]) => {
        setPredictions(pData || []);
        setBonuses(bData || []);
        setTrivias(tData || []);
        // Actualiza puntos en vivo desde ranking fresco
        const found = (rankData || []).find(r => r.user_id === user.user_id);
        if (found) {
          setLivePoints(found.points);
          if (onRefreshPoints) onRefreshPoints(rankData);
        }
      })
      .catch((err) => {
        console.error("Error loading user transparency data", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (!user) return null;

  const BONUS_DETAILS = {
    champion: { label: "Campeón del Mundial", icon: Trophy },
    runner_up: { label: "Subcampeón del Mundial", icon: Award },
    top_scorer: { label: "Goleador del torneo", icon: Star },
    best_player: { label: "Mejor jugador del torneo", icon: User },
    best_goalkeeper: { label: "Mejor arquero del torneo", icon: Shield },
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-emerald-50/50 to-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm shrink-0 border border-slate-200" />
            ) : (
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-sm sm:text-base shadow-sm shrink-0">
                {getInitials(user.name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-base sm:text-xl text-slate-800 tracking-tight truncate">
                  {user.name}
                </h2>
                <Link
                  to={`/perfil/${user.user_id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  Ver perfil →
                </Link>
              </div>
              <p className="text-[11px] text-slate-400">Picks del participante</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="card-surface px-2.5 py-1 flex items-center gap-1 bg-emerald-50 border-emerald-100">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-display font-black text-emerald-600 text-sm sm:text-base">{livePoints}</span>
              <span className="text-[10px] text-emerald-700 font-bold">pts</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("predictions")}
            className={`shrink-0 px-3 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              tab === "predictions"
                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            Pronósticos ({predictions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("bonus")}
            className={`shrink-0 px-3 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              tab === "bonus"
                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            Bonus
          </button>
          <button
            type="button"
            onClick={() => setTab("trivia")}
            className={`shrink-0 px-3 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              tab === "trivia"
                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            Trivia ({trivias.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <span className="inline-block animate-spin mr-2">⏳</span> Cargando información...
            </div>
          ) : tab === "predictions" ? (
            predictions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No hay partidos disponibles en este momento.
              </div>
            ) : (
              <div className="space-y-3 animate-fade-up">
                {predictions.map((p) => {
                  const m = p.match;
                  const hasPred = p.prediction != null;
                  const isVisible = p.is_visible;
                  const hasSaved = p.has_prediction;
                  const isFinalized = m.status === "finalized";
                  return (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-4">
                      {/* Match Details */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {m.group_name ? `Grupo ${m.group_name}` : m.ronda || ""}
                        </div>
                        <div className="flex items-center gap-2 mt-1 min-w-0">
                          <span className="font-semibold text-slate-800 text-sm truncate shrink-0 max-w-[85px] sm:max-w-[120px]">
                            {m.home_team}
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold">vs</span>
                          <span className="font-semibold text-slate-800 text-sm truncate shrink-0 max-w-[85px] sm:max-w-[120px]">
                            {m.away_team}
                          </span>
                        </div>
                        {isFinalized && (
                          <div className="text-[10.5px] text-slate-400 mt-1">
                            Resultado: <span className="font-bold text-slate-600">{m.home_score} – {m.away_score}</span>
                          </div>
                        )}
                      </div>

                      {/* Prediction and Score */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Pick</span>
                          <span className={`font-display font-bold text-sm sm:text-base ${hasPred ? "text-emerald-600" : isVisible ? "text-slate-300" : "text-slate-400"}`}>
                            {hasPred
                              ? `${p.prediction.pred_home} – ${p.prediction.pred_away}`
                              : !isVisible && hasSaved
                                ? "🔒 Oculto"
                                : "—"
                            }
                          </span>
                        </div>
                        <div className="min-w-[90px] text-right">
                          {isFinalized ? (
                            <PointsBadge pts={p.points} />
                          ) : isVisible ? (
                            hasSaved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                                Cerrado
                              </span>
                            ) : (
                              <PointsBadge pts={null} />
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-400 shrink-0">
                              No iniciado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : tab === "bonus" ? (
            <div className="animate-fade-up">
              {/* Long-term predictions list */}
              <div className="space-y-3">
                {Object.entries(BONUS_DETAILS).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  const match = bonuses.find((b) => b.type === type);
                  const hasStarted = predictions.length > 0;
                  
                  return (
                    <div key={type} className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <Icon className="w-4.5 h-4.5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate">{cfg.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            {match ? (
                              <span>Pick: <strong className="text-slate-700 font-semibold">{match.value}</strong></span>
                            ) : (
                              <span className="text-slate-400">Sin pronóstico</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0">
                        {match && match.points_earned != null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                            +{match.points_earned} pts
                          </span>
                        ) : match ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-400">
                            Pendiente
                          </span>
                        ) : !hasStarted ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-400">
                            Oculto
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-400">
                            0 pts
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {bonuses.length === 0 && predictions.length === 0 && (
                <p className="text-xs text-slate-400 text-center mt-6">
                  🔒 Los picks bonus se revelarán una vez que comience el torneo para evitar que otros jugadores copien la estrategia.
                </p>
              )}
            </div>
          ) : (
            /* TRIVIA TAB */
            <div className="animate-fade-up">
              {trivias.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No hay trivias respondidas todavía.
                </div>
              ) : (
                <div className="space-y-2">
                  {[...trivias].sort((a,b) => a.answered_date.localeCompare(b.answered_date)).map((t) => {
                    const dayNum = Math.floor((new Date(t.answered_date + "T00:00:00Z") - new Date("2026-06-11T00:00:00Z")) / 86400000) + 1;
                    return (
                      <div key={t.question_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Pregunta — Día {dayNum}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {t.hide_today ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                              🔒 Oculto hoy
                            </span>
                          ) : t.is_correct ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                              ✓ +0.5 pt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                              ✗ 0 pt
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs px-5 py-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confeti simple con CSS + Jugador Destacado ───────────────────────────────
const CONFETTI_COLORS = ["#10b981","#f59e0b","#3b82f6","#f43f5e","#a855f7","#06b6d4"];

function HeroDestacado({ hero }) {
  const [show, setShow] = useState(false);
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    // Genera confeti al montar
    const arr = Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 1.8 + Math.random() * 1.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 6,
      rotate: Math.random() * 360,
    }));
    setPieces(arr);
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, [hero.user.id]);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-500 ${show ? "translate-y-0" : "translate-y-full"}`}>
      {/* Confeti */}
      <div className="absolute inset-x-0 bottom-full h-32 pointer-events-none overflow-hidden">
        {pieces.map(p => (
          <div
            key={p.id}
            className="absolute bottom-0 animate-confetti"
            style={{
              left: `${p.x}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.id % 3 === 0 ? "50%" : "2px",
              transform: `rotate(${p.rotate}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      {/* Card destacado */}
      <div className="bg-slate-900 border-t border-slate-700 shadow-[0_-8px_40px_rgba(0,0,0,0.3)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-0.5">
              Jugador destacado
            </div>
            <div className="font-display font-black text-white text-sm leading-tight truncate">
              {hero.user.name}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="font-display font-black text-emerald-400 text-xl leading-none">
              {hero.points}
              <span className="text-[11px] font-bold text-emerald-600 ml-1">pts</span>
            </div>
            <div className="text-[9px] text-slate-600 mt-0.5">{hero.dateLabel}</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

// ── Vista "Montaña" — escalando hacia la cima, tipo gráfica de trading ──────

const MOUNTAIN_ZONES = [
  { from: 0.75, to: 1,    label: "Zona Cima",     desc: "Para los cracks 🏆",        color: "text-emerald-700" },
  { from: 0.5,  to: 0.75, label: "Zona Despegue", desc: "Ya casi llegan 🚀",         color: "text-teal-600" },
  { from: 0.25, to: 0.5,  label: "Zona Tibia",    desc: "Ni fu ni fa 😐",            color: "text-amber-600" },
  { from: 0,    to: 0.25, label: "Zona Arranque", desc: "Recién calentando motores 🐴", color: "text-rose-500" },
];

function MountainChip({ r, x, y, isMe, isLast, trend, onSelect }) {
  return (
    <button
      onClick={() => onSelect(r)}
      title={`${r.name} · ${r.points} pts`}
      className="absolute -translate-x-1/2 transition-[bottom,left] duration-[1100ms] ease-in-out z-10 hover:z-20"
      style={{ left: `${x}%`, bottom: `${y}%` }}
    >
      <span
        className="block animate-floaty"
        style={{ animationDelay: `${(x % 30) / 10}s`, animationDuration: `${3 + (x % 20) / 10}s` }}
      >
        <span
          className={`relative flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-full bg-white border shadow-sm hover:scale-110 hover:shadow-md active:scale-95 transition-transform whitespace-nowrap
            ${isMe ? "border-emerald-400 ring-2 ring-emerald-200" : trend === "up" ? "border-emerald-300" : trend === "down" ? "border-rose-300" : "border-slate-200"}`}
        >
          {trend === "up" && <span className="text-emerald-500 text-[9px] shrink-0">▲</span>}
          {trend === "down" && <span className="text-rose-500 text-[9px] shrink-0">▼</span>}
          <span className="text-[10px] font-bold text-slate-700 max-w-[78px] truncate">{r.name}</span>
          {isLast && (
            <img src={BURRO_IMG} alt="" className="absolute -bottom-2.5 -right-2.5 w-5 h-5 object-contain" />
          )}
        </span>
      </span>
    </button>
  );
}

function MountainView({ rows, user, onSelect }) {
  const prevPointsRef = useRef(new Map());
  const [trends, setTrends] = useState(new Map());

  useEffect(() => {
    if (rows.length === 0) return;
    const newTrends = new Map();
    for (const r of rows) {
      const prev = prevPointsRef.current.get(r.user_id);
      if (prev != null && r.points !== prev) {
        newTrends.set(r.user_id, r.points > prev ? "up" : "down");
      }
    }
    prevPointsRef.current = new Map(rows.map((r) => [r.user_id, r.points]));
    if (newTrends.size > 0) {
      setTrends(newTrends);
      const t = setTimeout(() => setTrends(new Map()), 8000);
      return () => clearTimeout(t);
    }
  }, [rows]);

  if (rows.length === 0) return null;

  // Orden ascendente por puntos: índice 0 = último lugar, último índice = líder
  const sorted = [...rows].sort((a, b) => (a.points || 0) - (b.points || 0));
  const minPts = sorted[0].points || 0;
  const maxPts = sorted[sorted.length - 1].points || 0;
  const span = maxPts - minPts;
  // Si todos van casi igual (ej. arranque del torneo), usamos un rango fijo
  // amable en vez de un span ~0 que generaría valores negativos/duplicados.
  const axisMin = span < 2 ? Math.max(0, minPts - 1) : Math.max(0, minPts - span * 0.15);
  const axisMax = span < 2 ? maxPts + 3 : maxPts + span * 0.15;
  const axisSpan = Math.max(axisMax - axisMin, 1);

  // Líneas de referencia: mínimo, máximo y pasos intermedios (sin duplicados)
  const gridValues = [...new Set(
    [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((axisMin + f * axisSpan) * 10) / 10)
  )];

  const lastUserId = sorted.length > 1 ? sorted[0].user_id : null;
  const pad = 6; // % de margen horizontal

  // Posiciona por altura real (puntos) y agrupa a quienes quedan muy cerca
  // en altura para repartirlos a lo ancho de TODA la pantalla (no en diagonal),
  // usando varias filas internas si hay muchos empatados en la misma banda.
  const withY = sorted.map((r) => ({
    ...r,
    baseY: Math.min(95, (((r.points || 0) - axisMin) / axisSpan) * 100),
  }));

  const bandThreshold = 5; // % de altura para considerarlos "a la misma altura"
  const bands = [];
  let currentBand = [];
  for (const item of withY) {
    const last = currentBand[currentBand.length - 1];
    if (!last || item.baseY - last.baseY <= bandThreshold) {
      currentBand.push(item);
    } else {
      bands.push(currentBand);
      currentBand = [item];
    }
  }
  if (currentBand.length) bands.push(currentBand);

  const maxPerRow = 7;
  const rowGap = 4.5; // % de separación vertical entre sub-filas de una misma banda
  const positioned = [];
  for (const band of bands) {
    const bandSorted = [...band].sort((a, b) => a.user_id.localeCompare(b.user_id));
    const subRows = Math.ceil(bandSorted.length / maxPerRow);
    for (let ri = 0; ri < subRows; ri++) {
      const rowItems = bandSorted.slice(ri * maxPerRow, (ri + 1) * maxPerRow);
      const n = rowItems.length;
      rowItems.forEach((item, idx) => {
        const x = n > 1 ? pad + ((idx + 0.5) / n) * (100 - 2 * pad) : 50;
        const y = Math.min(97, item.baseY + ri * rowGap);
        positioned.push({ ...item, x, y });
      });
    }
  }

  return (
    <div className="card-surface p-4 sm:p-6 animate-fade-up">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">⛰️</span>
        <h3 className="font-display font-black text-sm text-slate-700">Subiendo la montaña</h3>
      </div>
      <p className="text-[11px] text-slate-400 mb-5">
        De último a líder — la altura es el puntaje real de cada uno, ▲▼ muestra si subió o bajó en la última actualización
      </p>

      <div className="relative ml-7" style={{ height: 620 }}>
        {/* Silueta de montaña de fondo */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="mtnFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#f8fafc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffe4e6" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <polygon points="-5,100 30,38 50,8 70,38 105,100" fill="url(#mtnFill)" />
        </svg>

        {/* Líneas de cuadrícula con valores del eje */}
        {gridValues.map((v, idx) => (
          <div
            key={idx}
            className="absolute left-0 right-0 border-t border-dashed border-slate-200"
            style={{ bottom: `${((v - axisMin) / axisSpan) * 100}%` }}
          >
            <span className="absolute -top-2 -left-7 text-[9px] font-bold text-slate-400 w-6 text-right">{v}</span>
          </div>
        ))}

        {/* Etiquetas de zona, divertidas, una por cuarto de altura */}
        {MOUNTAIN_ZONES.map((z) => (
          <div
            key={z.label}
            className="absolute right-2 text-right pointer-events-none z-0"
            style={{ bottom: `${((z.from + z.to) / 2) * 100}%`, transform: "translateY(50%)" }}
          >
            <div className={`text-[10px] font-black uppercase tracking-wide ${z.color} opacity-60`}>{z.label}</div>
            <div className="text-[9px] text-slate-400 opacity-80">{z.desc}</div>
          </div>
        ))}

        {/* Bolsa de premios en la cima */}
        <div className="absolute left-1/2 -translate-x-1/2 text-2xl select-none" style={{ bottom: "97%" }}>💰</div>

        {/* Jugadores flotando a la altura real de sus puntos, repartidos por todo el ancho */}
        {positioned.map((r) => {
          return (
            <MountainChip
              key={r.user_id}
              r={r}
              x={r.x}
              y={r.y}
              isMe={user && r.user_id === user.id}
              isLast={r.user_id === lastUserId}
              trend={trends.get(r.user_id)}
              onSelect={onSelect}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes floaty {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .animate-floaty {
          animation-name: floaty;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}

export default function Ranking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dailyHero, setDailyHero] = useState(null);
  const [viewMode, setViewMode] = useState("lista"); // "lista" | "zonas"

  const loadRanking = async () => {
    try {
      const [rankingRes, heroRes] = await Promise.all([
        api.get("/ranking"),
        api.get("/ranking/daily-hero").catch((err) => {
          console.error("Error loading daily hero", err);
          return { data: null };
        }),
      ]);
      setRows(rankingRes.data);
      setDailyHero(heroRes.data);
    } finally {
      setLoading(false);
    }
  };

  usePolling(loadRanking, 20000);
  useRealtimeMatches(loadRanking);

  useEffect(() => {
    const onRankingRefresh = () => {
      loadRanking();
    };

    const onStorage = (event) => {
      if (event.key === "ranking_refresh_tick") {
        loadRanking();
      }
    };

    window.addEventListener("ranking:refresh", onRankingRefresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("ranking:refresh", onRankingRefresh);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const podiumColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const podiumBg = ["bg-yellow-50 border-yellow-200", "bg-slate-50 border-slate-200", "bg-amber-50 border-amber-200"];

  const myIndex = rows.findIndex((r) => user && r.user_id === user.id);
  const myPosition = myIndex !== -1 ? myIndex + 1 : null;

  const scrollToMyPosition = () => {
    const el = document.getElementById("my-ranking-row");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-emerald-100");
      setTimeout(() => {
        el.classList.remove("bg-emerald-100");
      }, 1500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-24 font-sans">
      <div className="mb-7 animate-fade-up">
        <span className="label-eyebrow">Tabla de posiciones</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1 tracking-tight text-slate-900">
          Ranking
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Se actualiza en tiempo real. Haz clic en un participante para ver sus picks.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode("lista")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "lista" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
          <button
            onClick={() => setViewMode("montana")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "montana" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Mountain className="w-3.5 h-3.5" /> Montaña
          </button>
        </div>
        {viewMode === "lista" && myPosition > 10 && (
          <button
            onClick={scrollToMyPosition}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2 px-3.5 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 duration-150"
          >
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            Ir a mi posición (#{myPosition})
          </button>
        )}
      </div>

      {viewMode === "montana" && !loading && rows.length > 0 && (
        <MountainView rows={rows} user={user} onSelect={setSelectedUser} />
      )}

      {viewMode === "lista" && (
      <div className="card-surface overflow-hidden">
        <div className="flex px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-bold text-slate-400 border-b border-slate-100">
          <div className="w-8">#</div>
          <div className="flex-1">Jugador</div>
          <div className="hidden sm:block w-16 text-center">Exactos</div>
          <div className="hidden sm:block w-16 text-center">Ganador</div>
          <div className="w-14 text-right">Pts</div>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-slate-400">Cargando ranking…</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-slate-400">
            Aún no hay puntuaciones. Espera a que finalicen los partidos.
          </div>
        ) : (
          rows.map((r, i) => {
            const isMe = user && r.user_id === user.id;
            const isLast = i === rows.length - 1 && rows.length > 1;
            return (
              <div
                key={r.user_id}
                id={isMe ? "my-ranking-row" : undefined}
                onClick={() => setSelectedUser(r)}
                className={`flex items-center px-4 py-3 border-b border-slate-100 last:border-0 transition-colors cursor-pointer ${
                  isMe ? "row-highlight" : "hover:bg-slate-50"
                }`}
                data-testid={`rank-row-${i + 1}`}
              >
                <div className="w-8 shrink-0">
                  {i < 3 ? (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${podiumBg[i]}`}>
                      <Medal className={`w-3.5 h-3.5 ${podiumColors[i]}`} />
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt={r.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-xs shrink-0">
                        {getInitials(r.name)}
                      </div>
                    )}
                    {isLast && (
                      <img src={BURRO_IMG} alt="Último lugar" title="Último lugar" className="absolute -bottom-3 -right-3 w-9 h-9 object-contain drop-shadow-md" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-slate-800 text-sm">
                      {r.name}
                      {isMe && <span className="text-emerald-600 text-xs ml-1 font-normal">(tú)</span>}
                      {isLast && <img src={BURRO_IMG} alt="" className="inline-block w-7 h-7 object-contain align-middle ml-1.5" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="sm:hidden">{r.exactos} exactos · {r.ganadores} ganador</span>
                      {r.bonus_pts > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[9px] shrink-0">
                          🏆 +{r.bonus_pts} bonus
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block w-16 text-center font-display font-bold text-emerald-600 text-sm">{r.exactos}</div>
                <div className="hidden sm:block w-16 text-center font-display font-bold text-slate-400 text-sm">{r.ganadores}</div>
                <div className="w-14 text-right font-display font-black text-xl text-slate-900 flex items-center justify-end gap-1">
                  {r.points}
                  <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Reglas:</span>{" "}
        3 pts marcador exacto · 2 pts ganador/empate correcto · 1 pt marcador parcial de un equipo · 0 pts sin acierto
      </div>

      {selectedUser && (
        <UserTransparencyModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefreshPoints={(rankData) => setRows(rankData)}
        />
      )}

      {dailyHero && <HeroDestacado hero={dailyHero} />}
    </div>
  );
}
