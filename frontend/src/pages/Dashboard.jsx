import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, formatDate } from "../lib/api";
import { toast } from "sonner";
import { Check, Lock, Globe, RotateCcw } from "lucide-react";
import MundialBanner from "../components/ChampionsBanner";
import usePolling from "../lib/usePolling";
import useRealtimeMatches from "../lib/useRealtimeMatches";

const PHASES = [
  { value: "all",   label: "Todos" },
  { value: "group", label: "Grupos" },
  { value: "R32",   label: "Octavos" },
  { value: "R16",   label: "Cuartos" },
  { value: "QF",    label: "Semis" },
  { value: "SF",    label: "Semifinales" },
  { value: "F",     label: "Final" },
];

function MatchCard({ match, prediction, onSaved }) {
  const [home, setHome] = useState(prediction?.pred_home ?? "");
  const [away, setAway] = useState(prediction?.pred_away ?? "");
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const finalized = match.status === "finalized";
  const locked = match.predictions_locked;
  const disabled = finalized || locked;

  useEffect(() => {
    setHome(prediction?.pred_home ?? "");
    setAway(prediction?.pred_away ?? "");
  }, [prediction?.pred_home, prediction?.pred_away]);

  const dirty = useMemo(() => {
    const h = String(home), a = String(away);
    const ph = prediction?.pred_home ?? "", pa = prediction?.pred_away ?? "";
    return h !== "" && a !== "" && (h !== String(ph) || a !== String(pa));
  }, [home, away, prediction]);

  const submit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    if (home === "" || away === "") {
      toast.error("Ingresa ambos marcadores");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/predictions", {
        match_id: match.id,
        pred_home: Number(home),
        pred_away: Number(away),
      });
      onSaved(data);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      toast.success("Guardado", { description: `${match.home_team} ${home} – ${away} ${match.away_team}` });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-surface p-5 animate-fade-up" data-testid={`match-card-${match.id}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="label-eyebrow text-slate-400">
          {match.group_name ? `Grupo ${match.group_name}` : match.ronda || ""}
        </span>
        {finalized ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3" /> Finalizado
          </span>
        ) : locked ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Cerrado
          </span>
        ) : (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            Pendiente
          </span>
        )}
      </div>

      <div className="text-xs text-slate-400 mb-4">{formatDate(match.match_date)}</div>

      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          {match.logo_home ? (
            <img src={match.logo_home} alt={match.home_team} className="team-logo" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-400">
              {match.home_team.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-sm font-semibold text-center truncate w-full text-slate-800" title={match.home_team}>
            {match.home_team}
          </div>
        </div>
        <div className="font-display font-black text-slate-300 text-xl">VS</div>
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          {match.logo_away ? (
            <img src={match.logo_away} alt={match.away_team} className="team-logo" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-400">
              {match.away_team.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-sm font-semibold text-center truncate w-full text-slate-800" title={match.away_team}>
            {match.away_team}
          </div>
        </div>
      </div>

      {finalized && (
        <div className="text-center mb-4">
          <span className="label-eyebrow">Resultado real</span>
          <div className="font-display font-black text-3xl mt-1 text-slate-900">
            {match.home_score} <span className="text-slate-300">–</span> {match.away_score}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div className="text-center">
          <span className="label-eyebrow">Tu pronóstico</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <input
            type="number" min={0} max={20} value={home}
            onChange={(e) => setHome(e.target.value)} disabled={disabled || busy}
            className="score-input" data-testid={`score-home-${match.id}`}
          />
          <span className="font-display font-bold text-slate-300 text-2xl">:</span>
          <input
            type="number" min={0} max={20} value={away}
            onChange={(e) => setAway(e.target.value)} disabled={disabled || busy}
            className="score-input" data-testid={`score-away-${match.id}`}
          />
        </div>

        {finalized ? (
          <button type="button" disabled className="btn-ghost w-full inline-flex items-center justify-center gap-2 cursor-not-allowed text-slate-400">
            <Lock className="w-4 h-4" /> Finalizado
          </button>
        ) : locked ? (
          <button type="button" disabled className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-sm cursor-not-allowed">
            <Lock className="w-4 h-4" /> Pronósticos cerrados
          </button>
        ) : savedFlash ? (
          <button type="button" disabled className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-sm">
            <Check className="w-4 h-4" /> Guardado con éxito
          </button>
        ) : (
          <button
            type="submit"
            disabled={busy || (!dirty && prediction == null && (home === "" || away === ""))}
            className="btn-primary w-full text-sm"
            data-testid={`save-prediction-${match.id}`}
          >
            {busy ? "Guardando…" : prediction ? "Actualizar pronóstico" : "Guardar pronóstico"}
          </button>
        )}
      </form>
    </div>
  );
}

export default function Dashboard() {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");

  const load = async () => {
    try {
      const [m, p] = await Promise.all([
        api.get("/matches"),
        api.get("/predictions/me"),
      ]);
      setMatches(m.data);
      setPredictions(p.data);
    } catch {
      // ignore polling errors
    } finally {
      setLoading(false);
    }
  };

  usePolling(load, 20000);
  useRealtimeMatches(load);

  const predByMatch = useMemo(() => {
    const map = {};
    for (const p of predictions) map[p.match_id] = p;
    return map;
  }, [predictions]);

  const onSaved = (saved) => {
    setPredictions((prev) => [...prev.filter((p) => p.match_id !== saved.match_id), saved]);
  };

  // Extract unique dates chronologically
  const uniqueDates = useMemo(() => {
    const dateMap = {};
    for (const m of matches) {
      if (m.match_date) {
        const d = new Date(m.match_date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        
        if (!dateMap[key]) {
          const label = d.toLocaleDateString("es-ES", {
            weekday: "short",
            day: "numeric",
            month: "short"
          });
          const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
          dateMap[key] = capLabel;
        }
      }
    }
    const sortedKeys = Object.keys(dateMap).sort();
    return sortedKeys.map(key => ({ value: key, label: dateMap[key] }));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Filter by phase
      if (phase !== "all" && m.phase !== phase) return false;
      
      // Filter by group
      if (selectedGroup !== "all" && m.group_name !== selectedGroup) return false;
      
      // Filter by date
      if (selectedDate !== "all") {
        const d = new Date(m.match_date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const matchDateKey = `${yyyy}-${mm}-${dd}`;
        if (matchDateKey !== selectedDate) return false;
      }
      
      return true;
    });
  }, [matches, phase, selectedGroup, selectedDate]);

  const availablePhases = useMemo(() => {
    const present = new Set(matches.map((m) => m.phase).filter(Boolean));
    return PHASES.filter((p) => p.value === "all" || present.has(p.value));
  }, [matches]);

  const pendingCount = matches.filter((m) => !predByMatch[m.id]).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <MundialBanner />
      <div className="mb-7 animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-emerald-600" />
          <span className="label-eyebrow text-emerald-600">Mundial 2026</span>
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-slate-900">
          Pronostica los partidos
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm max-w-xl">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {pendingCount} partidos pendientes
          </span>
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="card-surface p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Phase Filter Tabs */}
        {availablePhases.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {availablePhases.map((p) => (
              <button
                key={p.value}
                className={`phase-tab ${phase === p.value ? "active" : ""}`}
                onClick={() => {
                  setPhase(p.value);
                  setSelectedGroup("all"); // Reset group filter when switching phases
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Group and Date Dropdowns */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Group Filter (Only relevant for Group Stage 'group' or general 'all') */}
          {(phase === "all" || phase === "group") && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Grupo:</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 cursor-pointer transition-colors"
              >
                <option value="all">Todos los grupos</option>
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((g) => (
                  <option key={g} value={g}>Grupo {g}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Fecha:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 cursor-pointer transition-colors"
            >
              <option value="all">Todas las fechas</option>
              {uniqueDates.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          {(selectedGroup !== "all" || selectedDate !== "all") && (
            <button
              onClick={() => {
                setSelectedGroup("all");
                setSelectedDate("all");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 py-8">Cargando partidos…</div>
      ) : filteredMatches.length === 0 ? (
        <div className="card-surface p-8 text-center text-slate-400">
          No hay partidos que coincidan con los filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="matches-grid">
          {filteredMatches.map((m) => (
            <MatchCard key={m.id} match={m} prediction={predByMatch[m.id]} onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
