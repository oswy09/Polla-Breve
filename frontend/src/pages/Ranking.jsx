import { useState, useEffect } from "react";
import { api, getInitials, formatDate } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Trophy, Medal, X, Star, Award, Shield, User, Calendar, Sparkles, ChevronDown } from "lucide-react";
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

function UserTransparencyModal({ user, onClose }) {
  const [tab, setTab] = useState("predictions"); // "predictions" | "bonus" | "trivia"
  const [predictions, setPredictions] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [trivias, setTrivias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.get(`/users/${user.user_id}/predictions`),
      api.get(`/users/${user.user_id}/bonus`),
      api.get(`/users/${user.user_id}/trivia`)
    ])
      .then(([{ data: pData }, { data: bData }, { data: tData }]) => {
        setPredictions(pData || []);
        setBonuses(bData || []);
        setTrivias(tData || []);
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
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-base shadow-sm">
              {getInitials(user.name)}
            </div>
            <div>
              <h2 className="font-display font-black text-xl text-slate-800 tracking-tight">
                Picks de {user.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparencia de pronósticos del participante
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="card-surface px-3 py-1 flex items-center gap-1.5 bg-emerald-50 border-emerald-100">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span className="font-display font-black text-emerald-600 text-base">{user.points}</span>
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
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setTab("predictions")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              tab === "predictions"
                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            Pronósticos de Partidos ({predictions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("bonus")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              tab === "bonus"
                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            Predicciones Bonus
          </button>
          <button
            type="button"
            onClick={() => setTab("trivia")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              tab === "trivia"
                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            Trivia Diaria ({trivias.length})
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
                <div className="space-y-3">
                  {trivias.map((t) => (
                    <div key={t.question_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Trivia Diaria (Pregunta {t.question_id})
                        </div>
                        <div className="font-semibold text-slate-800 text-sm mt-1 leading-normal">
                          {t.question}
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5">
                          Respuesta seleccionada: <strong className="text-slate-700 font-semibold">{t.selected_option}</strong>
                        </div>
                        {!t.is_today && (
                          <div className="text-[10.5px] text-slate-400 mt-0.5">
                            Respuesta correcta: <span className="font-semibold text-slate-600">{t.correct_option}</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {t.is_today ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                            🔒 Oculto hoy
                          </span>
                        ) : t.is_correct ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                            ✓ Correcto (+0.5 pt)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                            ✗ Incorrecto (+0 pt)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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

export default function Ranking() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dailyHero, setDailyHero] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

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

      {myPosition > 10 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={scrollToMyPosition}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2 px-3.5 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 duration-150"
          >
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            Ir a mi posición (#{myPosition})
          </button>
        </div>
      )}

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
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-xs shrink-0">
                    {getInitials(r.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-slate-800 text-sm">
                      {r.name}
                      {isMe && <span className="text-emerald-600 text-xs ml-1 font-normal">(tú)</span>}
                    </div>
                    <div className="sm:hidden text-[10px] text-slate-400 mt-0.5">
                      {r.exactos} exactos · {r.ganadores} ganador
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

      <div className="mt-4 text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Reglas:</span>{" "}
        3 pts marcador exacto · 2 pts ganador/empate correcto · 1 pt marcador parcial de un equipo · 0 pts sin acierto
      </div>

      {selectedUser && (
        <UserTransparencyModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}

      {dailyHero && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-2xl transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-[80vh] h-[500px]" : "h-16"
          } font-sans`}
        >
          <div className="max-w-md mx-auto h-full flex flex-col px-4">
            <div 
              onClick={() => setIsOpen(!isOpen)}
              className="py-2.5 flex flex-col items-center cursor-pointer select-none"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors mb-1.5" />
              
              {!isOpen && (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse shrink-0" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {dailyHero.dateLabel === "hoy" ? "Jugador de hoy" : "Mejor jugador de ayer"}:
                    </span>
                    <span className="text-sm font-black text-slate-800 truncate">
                      {dailyHero.user.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-emerald-600 text-sm shrink-0">
                      +{dailyHero.points} pts
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 border border-slate-200/60 rounded-full px-2 py-0.5">
                      Ver picks
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isOpen && (
              <div className="flex-1 flex flex-col min-h-0 pb-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-sm shadow-sm">
                      {getInitials(dailyHero.user.name)}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-slate-800 text-base leading-tight">
                        {dailyHero.user.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {dailyHero.dateLabel === "hoy" ? "Destacado de hoy" : "Mejor jugador de ayer"} ({dailyHero.dateStr})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="card-surface px-2.5 py-1 flex items-center gap-1 bg-emerald-50 border-emerald-100">
                      <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-display font-black text-emerald-600 text-sm">+{dailyHero.points}</span>
                      <span className="text-[9px] text-emerald-700 font-bold">pts</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 transition"
                      aria-label="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Pronósticos de la jornada
                  </span>
                  {dailyHero.predictions.map((p) => {
                    const m = p.match;
                    const hasPred = p.prediction != null;
                    const isFinalized = m.status === "finalized";
                    return (
                      <div 
                        key={m.id} 
                        className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/50 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-bold text-slate-400 tracking-wider">
                            {m.ronda || ""}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-700">
                            <span className="truncate max-w-[80px]">{m.home_team}</span>
                            <span className="text-[9px] text-slate-300">vs</span>
                            <span className="truncate max-w-[80px]">{m.away_team}</span>
                          </div>
                          {isFinalized && (
                            <div className="text-[9.5px] text-slate-400 font-medium">
                              Resultado: <span className="font-bold text-slate-600">{m.home_score} – {m.away_score}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex justify-end items-center gap-3 shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Pick</span>
                            <span className="font-display font-bold text-xs text-emerald-600">
                              {hasPred ? `${p.prediction.pred_home} – ${p.prediction.pred_away}` : "—"}
                            </span>
                          </div>
                          <div className="min-w-[80px] text-right">
                            {isFinalized ? (
                              <PointsBadge pts={p.points} />
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-400 shrink-0">
                                {m.status === "finalized" ? "Finalizado" : "En juego"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
