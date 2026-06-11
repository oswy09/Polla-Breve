import { useState, useEffect, useMemo } from "react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { Star, Trophy, Check, Lock, Award, Shield, User, HelpCircle } from "lucide-react";

const BONUS_TYPES = [
  {
    type: "champion",
    label: "Campeón del Mundial",
    description: "¿Qué selección levanta la copa? +5 pts si aciertas.",
    icon: Trophy,
    needsCountry: false,
    placeholder: "ej. Argentina",
  },
  {
    type: "runner_up",
    label: "Subcampeón del Mundial",
    description: "¿Qué selección quedará en segundo lugar? +3 pts si aciertas.",
    icon: Award,
    needsCountry: false,
    placeholder: "ej. Francia",
  },
  {
    type: "top_scorer",
    label: "Goleador del torneo",
    description: "¿De qué selección será el goleador? +3 pts si aciertas.",
    icon: Star,
    needsCountry: false,
    placeholder: "ej. Francia",
  },
  {
    type: "best_player",
    label: "Mejor jugador del torneo",
    description: "¿De qué selección será el mejor jugador? +3 pts si aciertas.",
    icon: User,
    needsCountry: false,
    placeholder: "ej. Argentina",
  },
  {
    type: "best_goalkeeper",
    label: "Mejor arquero del torneo",
    description: "¿De qué selección será el mejor arquero? +3 pts si aciertas.",
    icon: Shield,
    needsCountry: false,
    placeholder: "ej. Argentina",
  },
];

const TRIVIA_TIMER_SECONDS = 15;
const TRIVIA_TEST_MODE = true;

function notifyRankingRefresh() {
  const tick = String(Date.now());
  localStorage.setItem("ranking_refresh_tick", tick);
  window.dispatchEvent(new Event("ranking:refresh"));
}

function TriviaCard() {
  const { user } = useAuth();
  const [testOffset] = useState(0);
  const [testRound, setTestRound] = useState(() => {
    const saved = localStorage.getItem("trivia_test_round");
    const parsed = Number(saved);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  });
  const [trivia, setTrivia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TRIVIA_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const [changingQuestion, setChangingQuestion] = useState(false);

  const loadTrivia = async (offset = testOffset, dayOffset = testRound) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/daily-trivia/question?testOffset=${offset}&testDayOffset=${dayOffset}`);
      setTrivia(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const localKey = user ? `trivia_reveal_${user.id}_${dateStr}_${testOffset}_${testRound}` : null;

  const clearRevealState = () => {
    if (localKey) {
      localStorage.removeItem(localKey);
    }
    setRevealed(false);
    setTimeLeft(TRIVIA_TIMER_SECONDS);
    setTimerActive(false);
    setSelectedIndex(null);
  };

  useEffect(() => {
    loadTrivia(testOffset, testRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testOffset, testRound]);

  const startNewRound = (withToast = false) => {
    clearRevealState();
    setChangingQuestion(true);
    setTestRound((prev) => {
      const next = prev + 1;
      localStorage.setItem("trivia_test_round", String(next));
      return next;
    });
    if (withToast) {
      toast.info("Pregunta reiniciada para otra prueba.");
    }
  };

  useEffect(() => {
    if (!loading) {
      setChangingQuestion(false);
    }
  }, [loading]);

  useEffect(() => {
    if (trivia && !trivia.answered && localKey) {
      const revealedAt = localStorage.getItem(localKey);
      if (revealedAt) {
        const elapsed = Math.floor((Date.now() - Number(revealedAt)) / 1000);
        if (elapsed >= TRIVIA_TIMER_SECONDS) {
          autoSubmitTimeout();
        } else {
          setRevealed(true);
          setTimeLeft(TRIVIA_TIMER_SECONDS - elapsed);
          setTimerActive(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trivia, localKey]);

  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      autoSubmitTimeout();
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, timeLeft]);

  const handleReveal = () => {
    if (localKey) {
      localStorage.setItem(localKey, String(Date.now()));
    }
    setRevealed(true);
    setTimeLeft(TRIVIA_TIMER_SECONDS);
    setTimerActive(true);
  };

  const autoSubmitTimeout = async () => {
    setSubmitting(true);
    setTimerActive(false);
    try {
      await api.post("/daily-trivia/answer", {
        question_id: trivia.question.id,
        selected_index: -1,
        testDayOffset: testRound,
      });
      toast.error(TRIVIA_TEST_MODE ? "Tiempo agotado. 0 puntos." : "Tiempo agotado.");
      startNewRound(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedIndex == null || submitting) return;
    setSubmitting(true);
    setTimerActive(false); // Stop timer
    try {
      const { data } = await api.post("/daily-trivia/answer", {
        question_id: trivia.question.id,
        selected_index: selectedIndex,
        testDayOffset: testRound,
      });
      if (data.is_correct) {
        notifyRankingRefresh();
        toast.success("¡Respuesta correcta! +0.5 puntos para el ranking.");
      } else {
        toast.error("Respuesta incorrecta.");
      }
      startNewRound(false);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al responder");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;
  if (!trivia) return null;

  const { question, answered } = trivia;

  if (answered) {
    return (
      <div className="card-surface p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/20 animate-fade-up font-sans">
        <div className="text-center py-5">
          <p className="text-sm text-slate-600 mb-4">Preparando la siguiente ronda de prueba...</p>
          <button
            type="button"
            onClick={() => startNewRound(true)}
            className="btn-primary text-sm px-6 py-2.5"
            disabled={changingQuestion}
          >
            {changingQuestion ? "Cargando..." : "Reiniciar pregunta"}
          </button>
        </div>
      </div>
    );
  }

  if (!revealed) {
    return (
      <div className="card-surface p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/20 animate-fade-up font-sans">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-amber-600 animate-pulse" />
          <span className="label-eyebrow text-amber-600 font-bold">Trivia Diaria (+0.5 pt.)</span>
          {TRIVIA_TEST_MODE && (
            <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              Modo pruebas
            </span>
          )}
        </div>

        <div className="text-center py-6 px-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <HelpCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-lg mb-2">
            Responder Quiz del día
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
            Al hacer clic, se revelará la pregunta y tendrás <strong>15 segundos</strong> para responder. ¡Solo tienes una oportunidad!
          </p>
          <button
            type="button"
            onClick={handleReveal}
            className="btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
          >
            Revelar pregunta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-5 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-slate-50 animate-fade-up font-sans">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-600 animate-pulse" />
          <span className="label-eyebrow text-emerald-600 font-bold">Trivia Diaria</span>
          {TRIVIA_TEST_MODE && (
            <span className="text-[10px] text-slate-400 font-semibold">(Pregunta fija temporal)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Tiempo:</span>
          <span className={`font-mono text-lg font-black ${timeLeft <= 5 ? "text-rose-600 animate-pulse scale-110" : "text-amber-600"}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-slate-800 text-sm sm:text-base mb-4">
        {question.question}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {question.options.map((opt, idx) => {
          const isSelected = idx === selectedIndex;
          const btnClass = "text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-150 " + 
            (isSelected 
              ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300");

          return (
            <button
              key={idx}
              type="button"
              disabled={submitting}
              onClick={() => setSelectedIndex(idx)}
              className={btnClass}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={selectedIndex == null || submitting || changingQuestion}
        onClick={handleSubmit}
        className="btn-primary w-full text-sm inline-flex justify-center items-center gap-2"
      >
        {submitting ? "Enviando..." : "Enviar Respuesta"}
      </button>
    </div>
  );
}

function BonusCard({ bonus: bonusDef, existing, onSaved, hasStarted, uniqueTeams }) {
  // Para bonus con país: guardamos "Nombre | País"
  const parseValue = (v) => {
    if (!v) return { name: "", country: "" };
    const parts = v.split(" | ");
    return { name: parts[0] || "", country: parts[1] || "" };
  };

  const saved = existing != null;
  const earned = existing?.points_earned;
  const disabled = hasStarted || false;
  const parsed = parseValue(existing?.value);

  const [name, setName] = useState(parsed.name);
  const [country, setCountry] = useState(parsed.country);
  const [value, setValue] = useState(existing?.value ?? ""); // para selects
  const [busy, setBusy] = useState(false);
  const Icon = bonusDef.icon;

  useEffect(() => {
    const p = parseValue(existing?.value);
    setName(p.name);
    setCountry(p.country);
    setValue(existing?.value ?? "");
  }, [existing?.value]);

  const submit = async (e) => {
    e.preventDefault();
    if (disabled) return;

    let finalValue = "";
    if (bonusDef.needsCountry) {
      if (!name.trim()) { toast.error("Ingresa el nombre del jugador"); return; }
      finalValue = country.trim() ? `${name.trim()} | ${country.trim()}` : name.trim();
    } else {
      if (!value.trim()) { toast.error("Selecciona una selección"); return; }
      finalValue = value.trim();
    }

    setBusy(true);
    try {
      const { data } = await api.post("/bonus", { type: bonusDef.type, value: finalValue });
      onSaved(data);
      toast.success(`"${bonusDef.label}" guardado`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-surface p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{bonusDef.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{bonusDef.description}</div>
          </div>
        </div>
        {earned != null && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
            <Check className="w-3 h-3" /> +{earned} pts
          </span>
        )}
      </div>

      <form onSubmit={submit} className="space-y-2">
        {bonusDef.needsCountry ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input w-full text-sm"
                placeholder={bonusDef.placeholder}
                disabled={disabled || busy}
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Nombre del jugador</span>
            </div>
            <div className="w-36">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="form-input w-full text-sm cursor-pointer"
                disabled={disabled || busy}
              >
                <option value="">-- País --</option>
                {uniqueTeams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Selección</span>
            </div>
          </div>
        ) : (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="form-input w-full text-sm cursor-pointer"
            disabled={disabled || busy}
          >
            <option value="">-- Selecciona una selección --</option>
            {uniqueTeams.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        )}

        {!hasStarted && (
          <button
            type="submit"
            disabled={busy || (bonusDef.needsCountry ? !name.trim() : !value.trim())}
            className="btn-primary text-sm w-full"
          >
            {busy ? "Guardando…" : saved ? "Actualizar" : "Guardar"}
          </button>
        )}
      </form>

      {saved && earned == null && (
        <p className="text-xs text-slate-400 mt-2">
          Guardado: <span className="font-semibold text-slate-600">{existing.value}</span>
          {hasStarted
            ? " · El torneo ya comenzó, no se puede modificar."
            : " · Los puntos se calcularán al finalizar el torneo."
          }
        </p>
      )}
    </div>
  );
}

export default function Bonus() {
  const [bonuses, setBonuses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/bonus/me"),
      api.get("/matches")
    ]).then(([{ data: bData }, { data: mData }]) => {
      setBonuses(bData);
      setMatches(mData);
      if (mData && mData.length > 0) {
        const earliest = new Date(mData[0].match_date);
        setHasStarted(new Date() >= earliest);
      }
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const bonusMap = Object.fromEntries(bonuses.map((b) => [b.type, b]));

  const onSaved = (saved) => {
    setBonuses((prev) => [...prev.filter((b) => b.type !== saved.type), saved]);
  };

  const uniqueTeams = useMemo(() => {
    const teams = new Set();
    for (const m of matches) {
      if (m.home_team) teams.add(m.home_team);
      if (m.away_team) teams.add(m.away_team);
    }
    return Array.from(teams)
      .filter(name => name && !/^[0-9]/.test(name) && !/Group/i.test(name) && !/Match/i.test(name) && !/mejor/i.test(name) && !/Lugar/i.test(name) && !/Semifinalista/i.test(name) && !/Finalista/i.test(name))
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [matches]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="animate-fade-up">
        <span className="label-eyebrow">Pronósticos especiales</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1 tracking-tight text-slate-900">
          Bonus y Trivia
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Predicciones de torneo y una trivia diaria para sumar puntos extra a tu ranking.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 py-8">Cargando…</div>
      ) : (
        <>
          {/* Trivia Diaria */}
          {hasStarted ? (
            <TriviaCard />
          ) : (
            <div className="card-surface p-5 border-l-4 border-l-amber-400 bg-amber-50/30">
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span className="label-eyebrow text-amber-600 font-bold">Trivia Diaria</span>
                <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  Próximamente
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                La trivia diaria inicia el <strong className="text-slate-700">jueves 11 de junio</strong> con el arranque del Mundial 2026. ¡Prepárate para sumar puntos extra respondiendo preguntas de fútbol!
              </p>
            </div>
          )}

          {/* Predicciones de torneo */}
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-slate-600" />
              Predicciones del torneo
              {hasStarted && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado
                </span>
              )}
            </h2>
            {BONUS_TYPES.map((b) => (
              <BonusCard
                key={b.type}
                bonus={b}
                existing={bonusMap[b.type]}
                onSaved={onSaved}
                hasStarted={hasStarted}
                uniqueTeams={uniqueTeams}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
