import { useEffect, useState } from "react";
import { api, formatApiError, formatDate } from "../lib/api";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";
import { ShieldCheck, RotateCcw, Users, Trophy, Check, X, Trash2, ClipboardList, Lock, LockOpen, MoreVertical, Flag, Save, RefreshCw, HelpCircle, Bell, Send, Flame, CalendarDays } from "lucide-react";
import { getInitials, triggerSync, sendPushNotification } from "../lib/api";
import { useLive } from "../lib/live";
import usePolling from "../lib/usePolling";
import useRealtimeMatches from "../lib/useRealtimeMatches";

const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const isLocalAdminPreviewEnabled = () =>
  typeof window !== "undefined" &&
  window.location.hostname === "localhost" &&
  new URLSearchParams(window.location.search).get("localPreview") === "1";

const LOCAL_PREVIEW_MATCHES_KEY = "breve2.localPreview.matches";
const LOCAL_PREVIEW_PREDICTIONS_KEY = "breve2.localPreview.predictions";
const LOCAL_PREVIEW_EVENT = "breve2-local-preview-updated";

const scorePrediction = (predLocal, predAway, realLocal, realAway) => {
  if (predLocal === realLocal && predAway === realAway) return 3;

  const sign = (home, away) => {
    if (home === away) return 0;
    return home > away ? 1 : -1;
  };

  if (sign(predLocal, predAway) === sign(realLocal, realAway)) return 2;
  if (predLocal === realLocal || predAway === realAway) return 1;
  return 0;
};

const DEMO_MATCHES = [
  {
    id: 101,
    home_team: "Argentina",
    away_team: "Francia",
    logo_home: "https://a.espncdn.com/i/teamlogos/soccer/500/2755.png",
    logo_away: "https://a.espncdn.com/i/teamlogos/soccer/500/577.png",
    match_date: "2026-07-26T15:00:00Z",
    status: "pending",
    predictions_locked: false,
    home_score: null,
    away_score: null,
    ronda: "Final · Mundial",
  },
];

const DEMO_USERS = [
  {
    id: "u-1",
    name: "Admin Local",
    email: "admin@local.test",
    role: "admin",
    paid: true,
    created_at: "2026-05-20T10:00:00Z",
  },
  {
    id: "u-2",
    name: "Laura Mendoza",
    email: "laura@example.com",
    role: "user",
    paid: true,
    created_at: "2026-05-21T10:00:00Z",
  },
  {
    id: "u-3",
    name: "Diego Rojas",
    email: "diego@example.com",
    role: "user",
    paid: false,
    created_at: "2026-05-22T10:00:00Z",
  },
];

const DEMO_PREDICTION_GROUPS = [
  {
    match: DEMO_MATCHES[0],
    predictions: [
      { id: "p-1", user_id: "u-2", match_id: 101, user_name: "Laura Mendoza", user_email: "laura@example.com", pred_home: 2, pred_away: 1, points: null },
      { id: "p-2", user_id: "u-3", match_id: 101, user_name: "Diego Rojas", user_email: "diego@example.com", pred_home: 1, pred_away: 2, points: null },
      { id: "p-3", user_id: "u-4", match_id: 101, user_name: "Camilo Torres", user_email: "camilo@example.com", pred_home: 0, pred_away: 1, points: null },
    ],
  },
];

const readLocalPreviewMatches = () => {
  if (typeof window === "undefined") return DEMO_MATCHES;
  try {
    const raw = window.localStorage.getItem(LOCAL_PREVIEW_MATCHES_KEY);
    if (!raw) return DEMO_MATCHES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEMO_MATCHES;
  } catch {
    return DEMO_MATCHES;
  }
};

const persistLocalPreviewMatches = (matches) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PREVIEW_MATCHES_KEY, JSON.stringify(matches));
    window.dispatchEvent(new CustomEvent(LOCAL_PREVIEW_EVENT));
  } catch {}
};

const readLocalPreviewPredictions = () => {
  if (typeof window === "undefined") return DEMO_PREDICTION_GROUPS[0].predictions;
  try {
    const raw = window.localStorage.getItem(LOCAL_PREVIEW_PREDICTIONS_KEY);
    if (!raw) return DEMO_PREDICTION_GROUPS[0].predictions;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEMO_PREDICTION_GROUPS[0].predictions;
  } catch {
    return DEMO_PREDICTION_GROUPS[0].predictions;
  }
};

const persistLocalPreviewPredictions = (predictions) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PREVIEW_PREDICTIONS_KEY, JSON.stringify(predictions));
    window.dispatchEvent(new CustomEvent(LOCAL_PREVIEW_EVENT));
  } catch {}
};

function AdminMatchRow({ match, onUpdated, users = [], predictedUserIds = new Set() }) {
  const [home, setHome] = useState(match.home_score ?? "");
  const [away, setAway] = useState(match.away_score ?? "");
  const [predictionUserId, setPredictionUserId] = useState("");
  const [predHome, setPredHome] = useState("");
  const [predAway, setPredAway] = useState("");
  const [predictionBusy, setPredictionBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const localPreview = isLocalAdminPreviewEnabled();

  // Sin selección por defecto — el admin elige explícitamente para evitar errores

  useEffect(() => {
    setHome(match.home_score ?? "");
    setAway(match.away_score ?? "");
  }, [match.home_score, match.away_score]);

  const saveScore = async (e) => {
    e.preventDefault();
    if (home === "" || away === "") {
      toast.error("Ingresa ambos marcadores");
      return;
    }

    if (localPreview) {
      onUpdated({ ...match, home_score: Number(home), away_score: Number(away) });
      toast.success("Marcador actualizado en vivo");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.put(`/matches/${match.id}/score`, {
        home_score: Number(home),
        away_score: Number(away),
      });
      toast.success("Marcador actualizado en vivo");
      onUpdated(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (home === "" || away === "") {
      toast.error("Ingresa ambos marcadores primero");
      return;
    }

    if (localPreview) {
      onUpdated({
        ...match,
        status: "finalized",
        predictions_locked: true,
        home_score: Number(home),
        away_score: Number(away),
      });
      toast.success("Partido finalizado ✓");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.put(`/matches/${match.id}/result`, {
        home_score: Number(home),
        away_score: Number(away),
      });
      toast.success("Partido finalizado ✓");
      onUpdated(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo finalizar");
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    if (localPreview) {
      onUpdated({
        ...match,
        status: "pending",
        predictions_locked: false,
        home_score: null,
        away_score: null,
      });
      toast.success("Partido reabierto");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.put(`/matches/${match.id}/reopen`);
      toast.success("Partido reabierto");
      onUpdated(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo reabrir");
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async () => {
    if (localPreview) {
      onUpdated({ ...match, predictions_locked: !locked });
      toast.success(!locked ? "Pronósticos cerrados" : "Pronósticos abiertos");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.put(`/matches/${match.id}/lock`, { locked: !locked });
      toast.success(!locked ? "Pronósticos cerrados" : "Pronósticos abiertos");
      onUpdated(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  };

  const propagateWinner = async (winner) => {
    setBusy(true);
    try {
      await api.put(`/matches/${match.id}/propagate`, { winner });
      toast.success(`${winner === "home" ? match.home_team : match.away_team} avanza al siguiente partido ✓`);
    } catch (err) {
      toast.error("No se pudo propagar el ganador");
    } finally {
      setBusy(false);
    }
  };

  const finalized = match.status === "finalized";
  const locked = match.predictions_locked;
  const isDraw = finalized && match.home_score !== null && match.home_score === match.away_score;

  const savePredictionForUser = async (e) => {
    e.preventDefault();

    if (!predictionUserId) {
      toast.error("Selecciona un usuario");
      return;
    }
    if (predHome === "" || predAway === "") {
      toast.error("Ingresa ambos marcadores");
      return;
    }

    if (localPreview) {
      const selectedUser = users.find((u) => u.id === predictionUserId);
      const existing = readLocalPreviewPredictions();
      const next = [
        ...existing.filter((p) => !(String(p.user_id) === String(predictionUserId) && String(p.match_id) === String(match.id))),
        {
          id: `p-${Date.now()}`,
          user_id: predictionUserId,
          match_id: match.id,
          user_name: selectedUser?.name || "Jugador",
          user_email: selectedUser?.email || "",
          goles_local: Number(predHome),
          goles_visitante: Number(predAway),
          points: null,
        },
      ];
      persistLocalPreviewPredictions(next);
      toast.success(`Pronóstico guardado para ${selectedUser?.name || "usuario"}`);
      return;
    }

    setPredictionBusy(true);
    try {
      const { data } = await api.post("/admin/predictions", {
        user_id: predictionUserId,
        match_id: match.id,
        pred_home: Number(predHome),
        pred_away: Number(predAway),
      });
      toast.success(`Pronóstico guardado para ${data.user_name || "usuario"}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo guardar el pronóstico");
    } finally {
      setPredictionBusy(false);
    }
  };

  return (
    <div className="card-surface p-5 flex flex-col gap-4" data-testid={`admin-row-${match.id}`}>
      <div className="flex-1 w-full">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="label-eyebrow !text-purple-300/80">{match.ronda || "Champions"}</span>
          <span className={`text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded ${
            finalized ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20" : "text-purple-300 bg-purple-500/10 border border-purple-500/20"
          }`}>
            {finalized ? "Finalizado" : "Pendiente"}
          </span>
          {!finalized && locked && (
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded text-amber-300 bg-amber-500/10 border border-amber-500/20 inline-flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Cerrado
            </span>
          )}
          <span className="text-[10px] text-zinc-500 ml-auto">{formatDate(match.match_date)}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src={match.logo_home} alt="" className="w-10 h-10 object-contain" />
          <div className="font-semibold flex-1 truncate">{match.home_team}</div>
          <span className="text-zinc-500 font-bold">vs</span>
          <div className="font-semibold flex-1 truncate text-right">{match.away_team}</div>
          <img src={match.logo_away} alt="" className="w-10 h-10 object-contain" />
        </div>
      </div>

      <form onSubmit={saveScore} className="flex items-center gap-2 flex-wrap justify-center">
        <input
          type="number" min={0} max={20} value={home} onChange={(e) => setHome(e.target.value)}
          disabled={busy} className="score-input !w-14 !h-12 !text-xl"
          data-testid={`admin-home-${match.id}`}
        />
        <span className="font-display font-bold text-zinc-600">:</span>
        <input
          type="number" min={0} max={20} value={away} onChange={(e) => setAway(e.target.value)}
          disabled={busy} className="score-input !w-14 !h-12 !text-xl"
          data-testid={`admin-away-${match.id}`}
        />
        <button type="submit" disabled={busy} className="btn-ghost text-sm border border-sky-500/30 text-sky-300 hover:bg-sky-500/10">
          Guardar marcador
        </button>
        {!finalized && (
          <button type="button" onClick={finalize} disabled={busy} className="btn-primary text-sm" data-testid={`admin-finalize-${match.id}`}>
            Finalizar partido
          </button>
        )}
        {(finalized || match.home_score !== null || match.away_score !== null) && (
          <button type="button" onClick={reopen} disabled={busy} className="btn-ghost text-sm inline-flex items-center gap-1 border border-amber-500/30 text-amber-500 hover:bg-amber-500/10" data-testid={`admin-reopen-${match.id}`}>
            <RotateCcw className="w-3.5 h-3.5" /> Reabrir / Limpiar
          </button>
        )}
        {isDraw && (
          <div className="w-full mt-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <p className="text-xs text-orange-300 font-semibold mb-2">⚽ Empate — ¿Quién avanza por penales?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => propagateWinner("home")} disabled={busy}
                className="flex-1 text-xs py-1.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-200 hover:bg-orange-500/30 font-medium">
                {match.home_team}
              </button>
              <button type="button" onClick={() => propagateWinner("away")} disabled={busy}
                className="flex-1 text-xs py-1.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-200 hover:bg-orange-500/30 font-medium">
                {match.away_team}
              </button>
            </div>
          </div>
        )}
        {!finalized && (
          <button
            type="button"
            onClick={toggleLock}
            disabled={busy}
            className={`btn-ghost text-sm inline-flex items-center gap-1 ${
              locked
                ? "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                : "border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            }`}
          >
            {locked ? <><LockOpen className="w-3.5 h-3.5" /> Abrir pronósticos</> : <><Lock className="w-3.5 h-3.5" /> Cerrar pronósticos</>}
          </button>
        )}
      </form>

      {/* Ingresar pronóstico por usuario */}
      {/* Quién falta por pronosticar */}
      {users.length > 0 && (() => {
        const missing = users.filter((u) => (u.role === "admin" || u.paid) && !predictedUserIds.has(u.id));
        if (missing.length === 0) return null;
        return (
          <div className="border-t border-white/10 pt-3 flex flex-col gap-1.5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-rose-400/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
              Faltan por pronosticar ({missing.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((u) => (
                <span
                  key={u.id}
                  onClick={() => setPredictionUserId(u.id)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 cursor-pointer hover:bg-rose-500/20 transition-colors"
                  title="Clic para seleccionar"
                >
                  {u.name}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {users.length > 0 && (
        <form onSubmit={savePredictionForUser} className="border-t border-white/10 pt-4 flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Ingresar pronóstico por usuario
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={predictionUserId}
              onChange={(e) => setPredictionUserId(e.target.value)}
              className="text-sm bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 cursor-pointer flex-1 min-w-[140px]"
            >
              <option value="">— Elige usuario —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <input
              type="number" min={0} max={20} value={predHome}
              onChange={(e) => setPredHome(e.target.value)}
              placeholder="L" className="score-input !w-12 !h-9 !text-base !bg-white !text-slate-800 !border-slate-200"
            />
            <span className="font-display font-bold text-zinc-400 text-sm">:</span>
            <input
              type="number" min={0} max={20} value={predAway}
              onChange={(e) => setPredAway(e.target.value)}
              placeholder="V" className="score-input !w-12 !h-9 !text-base !bg-white !text-slate-800 !border-slate-200"
            />
            <button
              type="submit" disabled={predictionBusy}
              className="btn-ghost text-sm border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 inline-flex items-center gap-1"
            >
              <ClipboardList className="w-3.5 h-3.5" /> Guardar pick
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

function CreateUserForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/admin/users", { name, email, password });
      toast.success(`Usuario ${data.name} creado`);
      onCreated(data);
      setName(""); setEmail(""); setPassword(""); setOpen(false);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo crear el usuario");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 btn-ghost text-sm border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 inline-flex items-center gap-2"
      >
        <Users className="w-4 h-4" /> Crear nuevo usuario
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card-surface p-5 mb-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-zinc-200">Crear nuevo usuario</span>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)}
          required className="bg-zinc-800 border border-white/10 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500/50 placeholder:text-zinc-500"
        />
        <input
          type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)}
          required className="bg-zinc-800 border border-white/10 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500/50 placeholder:text-zinc-500"
        />
        <input
          type="password" placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)}
          required minLength={6} className="bg-zinc-800 border border-white/10 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500/50 placeholder:text-zinc-500"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary text-sm">
          {busy ? "Creando…" : "Crear usuario"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function PaidToggle({ paid, onClick, busy, testId }) {
  return (
    <button
      type="button" onClick={onClick} disabled={busy}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-[0.15em] transition-all border ${
        paid
          ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25"
          : "bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20"
      } ${busy ? "opacity-50 cursor-wait" : ""}`}
    >
      {paid ? <><Check className="w-3.5 h-3.5" /> Pagado</> : <><X className="w-3.5 h-3.5" /> Pendiente</>}
    </button>
  );
}

function UsersTab({ onlineUsers, onlineCount }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const localPreview = isLocalAdminPreviewEnabled();

  const load = async () => {
    if (localPreview) {
      setUsers(DEMO_USERS);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePaid = async (u) => {
    if (localPreview) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, paid: !x.paid } : x)));
      toast.success("Actualizado en modo preview local");
      return;
    }

    setBusyId(u.id);
    try {
      const { data } = await api.put(`/admin/users/${u.id}/paid`, { paid: !u.paid });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? data : x)));
      toast.success(data.paid ? `${data.name} marcado como pagado` : `${data.name} marcado como pendiente`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "No se pudo actualizar");
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (u) => {
    if (localPreview) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success("Usuario ocultado en preview local");
      return;
    }

    if (!window.confirm(`¿Eliminar a ${u.name}? Se borrarán también sus pronósticos.`)) return;
    setBusyId(u.id);
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(`${u.name} eliminado`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  };

  const paidCount = users.filter((u) => u.paid).length;
  const pendingCount = users.length - paidCount;
  const onlineIds = new Set(onlineUsers.map((u) => u.user_id));
  const connectedUsers = users.filter((u) => onlineIds.has(u.id));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="card-surface p-4">
          <div className="label-eyebrow">Inscritos</div>
          <div className="font-display font-black text-3xl mt-1">{users.length}</div>
        </div>
        <div className="card-surface p-4">
          <div className="label-eyebrow">Pagados</div>
          <div className="font-display font-black text-3xl mt-1 text-emerald-300">{paidCount}</div>
        </div>
        <div className="card-surface p-4">
          <div className="label-eyebrow">Por cobrar</div>
          <div className="font-display font-black text-3xl mt-1 text-rose-300">{pendingCount}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{formatCOP(pendingCount * 30000)}</div>
        </div>
        <div className="card-surface p-4">
          <div className="label-eyebrow">Logueados</div>
          <div className="font-display font-black text-3xl mt-1 text-emerald-300">{onlineCount}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Usuarios conectados ahora</div>
        </div>
      </div>

      <div className="card-surface p-4 mb-5">
        <div className="label-eyebrow">Sesiones activas</div>
        {connectedUsers.length === 0 ? (
          <div className="text-sm text-zinc-500 mt-2">No hay usuarios conectados en este momento.</div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {connectedUsers.map((user) => (
              <div key={user.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
                <span className="font-medium">{user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateUserForm onCreated={(u) => setUsers((prev) => [...prev, u])} />

      {loading ? (
        <div className="text-zinc-400">Cargando inscritos…</div>
      ) : users.length === 0 ? (
        <div className="card-surface p-8 text-center text-zinc-400">No hay inscritos todavía.</div>
      ) : (
        <div className="card-surface overflow-hidden" data-testid="admin-users-list">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-[0.18em] font-bold text-zinc-500 border-b border-white/5">
            <div className="col-span-5 sm:col-span-4">Usuario</div>
            <div className="col-span-4 sm:col-span-4">Correo</div>
            <div className="hidden sm:block col-span-2">Inscrito</div>
            <div className="col-span-3 sm:col-span-2 text-right">Estado</div>
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-12 items-center px-5 py-3 border-b border-white/5 hover:bg-white/[0.02]"
              data-testid={`admin-user-row-${u.id}`}
            >
              <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full text-white font-display font-bold flex items-center justify-center text-sm shrink-0 ${u.role === "admin" ? "bg-gradient-to-br from-purple-500 to-purple-700" : "bg-purple-600"}`}>
                  {getInitials(u.name)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 flex items-center gap-2">
                    <span>{u.role}</span>
                    {onlineIds.has(u.id) && <span className="text-emerald-300">En l\u00ednea</span>}
                  </div>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-4 text-sm text-zinc-300 truncate">{u.email}</div>
              <div className="hidden sm:block col-span-2 text-xs text-zinc-500">{u.created_at ? formatDate(u.created_at) : "—"}</div>
              <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2">
                <PaidToggle
                  paid={u.paid}
                  busy={busyId === u.id}
                  onClick={() => togglePaid(u)}
                  testId={`admin-paid-toggle-${u.id}`}
                />
                {u.role !== "admin" && (
                  <button
                    type="button"
                    onClick={() => removeUser(u)}
                    disabled={busyId === u.id}
                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1.5"
                    data-testid={`admin-delete-${u.id}`}
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function getColombiaDateStr() {
  const now = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function MatchesTab() {
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [predGroups, setPredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [openMatches, setOpenMatches] = useState({});
  const localPreview = isLocalAdminPreviewEnabled();

  const load = async () => {
    if (localPreview) {
      const localMatches = readLocalPreviewMatches();
      setMatches(localMatches);
      setUsers(DEMO_USERS);
      setLoading(false);
      return;
    }

    try {
      const [matchesResponse, usersResponse, predsResponse] = await Promise.all([
        api.get("/matches"),
        api.get("/admin/users"),
        api.get("/admin/predictions"),
      ]);
      setMatches(matchesResponse.data);
      setUsers(usersResponse.data);
      setPredGroups(predsResponse.data);
    } finally {
      setLoading(false);
    }
  };

  usePolling(load, 30000);
  useRealtimeMatches(load);

  const onUpdated = (m) => {
    setMatches((prev) => {
      const next = prev.map((x) => (x.id === m.id ? m : x));
      if (localPreview) persistLocalPreviewMatches(next);
      return next;
    });
    // Reload predictions after a result change
    if (!localPreview) {
      api.get("/admin/predictions").then(({ data }) => setPredGroups(data)).catch(() => {});
    }
  };

  // Build a map: matchId → Set of user_ids that have a prediction
  const predictedByMatch = new Map();
  for (const { match, predictions } of predGroups) {
    predictedByMatch.set(match.id, new Set(predictions.map((p) => p.user_id)));
  }

  const todayStr = getColombiaDateStr();

  const matchOrder = (m) => {
    const dateStr = m.match_date?.slice(0, 10);
    if (dateStr === todayStr) return 0;
    if (m.status !== "finalized") return 1;
    return 2;
  };
  const sortedMatches = [...matches].sort((a, b) => {
    const oa = matchOrder(a), ob = matchOrder(b);
    if (oa !== ob) return oa - ob;
    return new Date(a.match_date) - new Date(b.match_date);
  });

  const toggleMatch = (id) =>
    setOpenMatches((prev) => ({ ...prev, [id]: !prev[id] }));

  const isMatchOpen = (m) => {
    const isToday = m.match_date?.slice(0, 10) === todayStr;
    // hoy: abierto por defecto a menos que explícitamente cerrado
    if (isToday) return openMatches[m.id] !== false;
    // resto: cerrado por defecto a menos que explícitamente abierto
    return openMatches[m.id] === true;
  };

  const handleCalculateQualifiers = async () => {
    setCalculating(true);
    try {
      const { data } = await api.post("/admin/calculate-qualifiers", {});
      if (data.updated > 0) {
        toast.success(`Actualizados ${data.updated} de ${data.totalR32} partidos de 16avos`);
      } else {
        toast.success("Sin cambios — aún no hay grupos suficientes finalizados, o ya estaba actualizado");
      }
      if (data.unresolved?.length > 0) {
        toast.error(`No se pudo resolver: ${data.unresolved.join(", ")}`);
      }
      await load();
    } catch (err) {
      toast.error(err.message || "No se pudo calcular");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) return <div className="text-zinc-400">Cargando…</div>;

  const todayMatches = sortedMatches.filter(m => m.match_date?.slice(0, 10) === todayStr);
  const otherMatches = sortedMatches.filter(m => m.match_date?.slice(0, 10) !== todayStr);

  const renderAccordion = (m) => {
    const isOpen = isMatchOpen(m);
    const finalized = m.status === "finalized";
    const isToday = m.match_date?.slice(0, 10) === todayStr;
    return (
      <div key={m.id} className="card-surface overflow-hidden">
        <button
          type="button"
          onClick={() => toggleMatch(m.id)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
        >
          <img src={m.logo_home} alt="" className="w-6 h-6 object-contain shrink-0" />
          <span className="font-semibold text-sm truncate flex-1">{m.home_team}</span>
          <span className="text-zinc-500 text-xs">vs</span>
          <span className="font-semibold text-sm truncate flex-1 text-right">{m.away_team}</span>
          <img src={m.logo_away} alt="" className="w-6 h-6 object-contain shrink-0" />
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {finalized && (
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                {m.home_score}–{m.away_score}
              </span>
            )}
            <span className={`text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded border ${
              finalized ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
              : isToday ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
              : "text-purple-300 bg-purple-500/10 border-purple-500/20"
            }`}>
              {finalized ? "Finalizado" : isToday ? "Hoy" : "Pendiente"}
            </span>
            <span className="text-zinc-500 text-xs">{m.match_date ? formatDate(m.match_date) : ""}</span>
            <span className="text-zinc-500 text-sm">{isOpen ? "▲" : "▼"}</span>
          </div>
        </button>
        {isOpen && (
          <div className="border-t border-white/10">
            <AdminMatchRow
              match={m}
              onUpdated={onUpdated}
              users={users}
              predictedUserIds={predictedByMatch.get(m.id) || new Set()}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleCalculateQualifiers}
        disabled={calculating}
        className="btn-primary inline-flex items-center gap-2 text-sm"
      >
        <RefreshCw className={`w-4 h-4 ${calculating ? "animate-spin" : ""}`} />
        {calculating ? "Calculando…" : "Calcular clasificados a 16avos"}
      </button>

      {todayMatches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <CalendarDays className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Partidos de hoy</span>
          </div>
          {todayMatches.map(renderAccordion)}
        </div>
      )}

      {otherMatches.length > 0 && (
        <div className="space-y-2">
          {todayMatches.length > 0 && (
            <div className="flex items-center gap-2 px-1 pt-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Otros partidos</span>
            </div>
          )}
          {otherMatches.map(renderAccordion)}
        </div>
      )}
    </div>
  );
}

function PredictionsTab() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});
  const localPreview = isLocalAdminPreviewEnabled();

  const buildLocalPreviewGroups = () => {
    const [match] = readLocalPreviewMatches();
    if (!match) return [];

    const predictions = readLocalPreviewPredictions()
      .filter((pred) => String(pred.match_id) === String(match.id))
      .map((pred) => ({
      ...pred,
      points:
        match.home_score != null && match.away_score != null
          ? scorePrediction(pred.pred_home, pred.pred_away, match.home_score, match.away_score)
          : null,
      }));

    return [{ match, predictions }];
  };

  useEffect(() => {
    if (localPreview) {
      setGroups(buildLocalPreviewGroups());
      setLoading(false);
      const onPreviewUpdate = () => setGroups(buildLocalPreviewGroups());
      window.addEventListener(LOCAL_PREVIEW_EVENT, onPreviewUpdate);
      return () => window.removeEventListener(LOCAL_PREVIEW_EVENT, onPreviewUpdate);
    }

    api.get("/admin/predictions")
      .then(({ data }) => setGroups(data))
      .catch((e) => toast.error(formatApiError(e.response?.data?.detail) || "No se pudieron cargar los pronósticos"))
      .finally(() => setLoading(false));
  }, [localPreview]);

  if (loading) return <div className="text-zinc-400">Cargando pronósticos…</div>;
  if (groups.length === 0) return <div className="card-surface p-8 text-center text-zinc-400">No hay partidos todavía.</div>;

  const todayCol = getColombiaDateStr();
  const predOrder = (m) => {
    const dateStr = m.match_date?.slice(0, 10);
    if (dateStr === todayCol) return 0;
    if (m.status !== "finalized") return 1;
    return 2;
  };
  const sortedGroups = [...groups].sort((a, b) => {
    const oa = predOrder(a.match), ob = predOrder(b.match);
    if (oa !== ob) return oa - ob;
    return new Date(a.match.match_date) - new Date(b.match.match_date);
  });

  const todayGroups = sortedGroups.filter(g => g.match.match_date?.slice(0, 10) === todayCol);
  const otherGroups = sortedGroups.filter(g => g.match.match_date?.slice(0, 10) !== todayCol);

  const isPredOpen = (match) => {
    const isToday = match.match_date?.slice(0, 10) === todayCol;
    if (isToday) return open[match.id] !== false;
    return open[match.id] === true;
  };

  const renderPredGroup = ({ match, predictions }) => {
        const isOpen = isPredOpen(match);
        const finalized = match.status === "finalized";
        const isToday = match.match_date?.slice(0, 10) === todayCol;
        return (
          <div key={match.id} className="card-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [match.id]: !isOpen }))}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <img src={match.logo_home} alt="" className="w-7 h-7 object-contain shrink-0" />
                <span className="font-semibold truncate">{match.home_team}</span>
                <span className="text-zinc-500 text-sm">vs</span>
                <span className="font-semibold truncate">{match.away_team}</span>
                <img src={match.logo_away} alt="" className="w-7 h-7 object-contain shrink-0" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {finalized && (
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {match.home_score} – {match.away_score}
                  </span>
                )}
                <span className={`text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded border ${
                  finalized ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                  : isToday ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                  : "text-purple-300 bg-purple-500/10 border-purple-500/20"
                }`}>{finalized ? "Finalizado" : isToday ? "Hoy" : "Pendiente"}</span>
                <span className="text-xs text-zinc-500">{predictions.length} pronóstico{predictions.length !== 1 ? "s" : ""}</span>
                <span className="text-zinc-500 text-sm">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && (
              predictions.length === 0 ? (
                <div className="px-5 pb-4 text-sm text-zinc-500">Nadie ha pronosticado este partido aún.</div>
              ) : (
                <div className="border-t border-white/5">
                  <div className="grid grid-cols-12 px-5 py-2 text-[10px] uppercase tracking-[0.18em] font-bold text-zinc-500">
                    <div className="col-span-5">Usuario</div>
                    <div className="col-span-4 text-center">Pronóstico</div>
                    <div className="col-span-3 text-right">Puntos</div>
                  </div>
                  {predictions.map((pred) => (
                    <div key={pred.id} className="grid grid-cols-12 items-center px-5 py-2.5 border-t border-white/5 hover:bg-white/[0.02]">
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-display font-bold flex items-center justify-center text-xs shrink-0">
                          {getInitials(pred.user_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{pred.user_name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{pred.user_email}</div>
                        </div>
                      </div>
                      <div className="col-span-4 text-center">
                        <span className="font-display font-black text-lg">{pred.pred_home} – {pred.pred_away}</span>
                      </div>
                      <div className="col-span-3 text-right">
                        {pred.points !== null ? (
                          <span className={`font-bold text-sm ${
                            pred.points === 3 ? "text-emerald-300" :
                            pred.points === 2 ? "text-sky-300" :
                            pred.points === 1 ? "text-yellow-300" : "text-zinc-500"
                          }`}>
                            {pred.points} pt{pred.points !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
  };

  return (
    <div className="space-y-3">
      {todayGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <CalendarDays className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Partidos de hoy</span>
          </div>
          {todayGroups.map(renderPredGroup)}
        </div>
      )}
      {otherGroups.length > 0 && (
        <div className="space-y-2">
          {todayGroups.length > 0 && (
            <div className="px-1 pt-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Otros partidos</span>
            </div>
          )}
          {otherGroups.map(renderPredGroup)}
        </div>
      )}
    </div>
  );
}

function AdminTriviaAssign({ pendingUsers, onDone }) {
  const [userId, setUserId] = useState("");
  const [triviaData, setTriviaData] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadQuestion = async (uid) => {
    setUserId(uid);
    setTriviaData(null);
    setSelectedIndex(null);
    if (!uid) return;
    setLoadingQ(true);
    try {
      const { data } = await api.get(`/admin/trivia/question?userId=${uid}`);
      setTriviaData(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando pregunta");
    } finally {
      setLoadingQ(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedIndex == null || submitting || !triviaData) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/trivia/answer", {
        user_id: userId,
        question_id: triviaData.question.id,
        selected_index: selectedIndex,
      });
      const userName = pendingUsers.find(u => u.id === userId)?.name || "Usuario";
      toast.success(`Trivia de ${userName} guardada — ${data.is_correct ? "✓ Correcto +0.5pts" : "✗ Incorrecto"}`);
      setUserId("");
      setTriviaData(null);
      setSelectedIndex(null);
      if (onDone) onDone();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-surface p-5 border-l-4 border-l-amber-400 space-y-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-amber-500" /> Asignar trivia a usuario
      </h3>

      <select
        value={userId}
        onChange={e => loadQuestion(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white"
      >
        <option value="">— Selecciona un usuario pendiente —</option>
        {pendingUsers.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      {loadingQ && <p className="text-sm text-slate-400">Cargando pregunta...</p>}

      {triviaData && triviaData.answered && (
        <p className="text-sm text-amber-600 font-semibold">Este usuario ya respondió hoy.</p>
      )}

      {triviaData && !triviaData.answered && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">{triviaData.question.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {triviaData.question.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={"text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all " +
                  (selectedIndex === idx
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={selectedIndex == null || submitting}
            onClick={handleSubmit}
            className="btn-primary w-full text-sm"
          >
            {submitting ? "Guardando..." : "Guardar respuesta"}
          </button>
        </div>
      )}
    </div>
  );
}

function VipOverridePanel({ users }) {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    // Por defecto: fecha de hoy en Colombia (UTC-5)
    const now = new Date(Date.now() - 5 * 60 * 60 * 1000);
    return now.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState([]);

  const loadOverrides = async () => {
    try {
      const { data } = await api.get("/admin/trivia/vip-overrides");
      setOverrides(data || []);
    } catch { /* silencioso */ }
  };

  useEffect(() => { loadOverrides(); }, []);

  const handleSave = async () => {
    if (!selectedUser || !selectedDate) return;
    setSaving(true);
    try {
      await api.post("/admin/trivia/vip-override", { user_id: selectedUser, override_date: selectedDate });
      toast.success("Pregunta VIP asignada 🎉");
      loadOverrides();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al guardar");
    } finally { setSaving(false); }
  };

  const handleDelete = async (user_id, override_date) => {
    try {
      await api.post("/admin/trivia/vip-override/delete", { user_id, override_date });
      toast.success("Override eliminado");
      loadOverrides();
    } catch { toast.error("Error al eliminar"); }
  };

  const userName = users.find(u => u.id === selectedUser)?.name || "";

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-amber-500" />
        <span className="font-bold text-sm text-amber-800">Pregunta VIP (bonus — siempre correcta)</span>
      </div>
      <p className="text-xs text-amber-700 leading-relaxed">
        Asigna la pregunta del cordón de Ghiggia a un usuario en una fecha específica.
        Esa persona verá esa pregunta en vez de la aleatoria del día, y cualquier respuesta contará como correcta (+0.5 pts).
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          className="text-sm border border-amber-300 rounded-lg px-3 py-2 bg-white text-slate-700 flex-1 min-w-[160px]"
        >
          <option value="">— Seleccionar usuario —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="text-sm border border-amber-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        />
        <button
          onClick={handleSave}
          disabled={!selectedUser || !selectedDate || saving}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Asignar VIP"}
        </button>
      </div>

      {overrides.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-800">Asignaciones activas:</p>
          {overrides.map(o => (
            <div key={o.id} className="flex items-center justify-between text-xs bg-white border border-amber-200 rounded-lg px-3 py-2">
              <span className="font-medium text-slate-700">{o.profiles?.name || o.user_id}</span>
              <span className="text-slate-400 mx-2">{o.override_date}</span>
              <button
                onClick={() => handleDelete(o.user_id, o.override_date)}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TriviaStatusTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: users }, { data: ranking }] = await Promise.all([
        api.get("/admin/users"),
        api.get("/ranking"),
      ]);
      // Get today's UTC date string
      const now = new Date();
      const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;

      // Colombia date for today
      const colombiaNow = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const colombiaStr = `${colombiaNow.getUTCFullYear()}-${String(colombiaNow.getUTCMonth()+1).padStart(2,'0')}-${String(colombiaNow.getUTCDate()).padStart(2,'0')}`;

      const triviaResults = await Promise.all(
        users.map(u =>
          api.get(`/users/${u.id}/trivia`)
            .then(({ data: trivias }) => {
              const todayTrivia = trivias.find(t => t.answered_date === colombiaStr);
              return {
                user: u,
                answeredToday: !!todayTrivia,
                correct: todayTrivia?.is_correct ?? null,
                question: todayTrivia?.question ?? null,
                selected_option: todayTrivia?.selected_option ?? null,
                correct_option: todayTrivia?.correct_option ?? null,
              };
            })
            .catch(() => ({ user: u, answeredToday: false, correct: null, question: null }))
        )
      );

      const answered = triviaResults.filter(r => r.answeredToday);
      const pending = triviaResults.filter(r => !r.answeredToday);
      setData({ answered, pending, todayStr: colombiaStr, users });
    } catch (err) {
      toast.error("Error cargando trivia");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);// eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-slate-400 py-8 text-sm">Cargando...</div>;
  if (!data) return null;

  const { answered, pending, todayStr, users } = data;
  const dayNum = Math.floor((new Date(todayStr + "T00:00:00Z") - new Date("2026-06-11T00:00:00Z")) / 86400000) + 1;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-800">Trivia del día — Día {dayNum}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{todayStr} · {answered.length} respondieron · {pending.length} pendientes</p>
        </div>
        <button onClick={load} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-1.5">
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {/* Asignar trivia */}
      <AdminTriviaAssign
        pendingUsers={pending.map(r => r.user)}
        onDone={load}
      />

      {/* Pregunta VIP */}
      <VipOverridePanel users={users} />

      {/* Pendientes */}
      <div>
        <h3 className="text-sm font-bold text-rose-600 mb-2 flex items-center gap-1.5">
          <X className="w-4 h-4" /> Faltan por responder ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">¡Todos respondieron hoy! 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pending.map(r => (
              <span key={r.user.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
                {r.user.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Respondieron */}
      <div>
        <h3 className="text-sm font-bold text-emerald-600 mb-2 flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Ya respondieron ({answered.length})
        </h3>
        {answered.length === 0 ? (
          <p className="text-sm text-slate-400">Nadie ha respondido aún.</p>
        ) : (
          <div className="space-y-2">
            {answered.map(r => (
              <div key={r.user.id} className={`p-3 rounded-xl border text-xs ${r.correct ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{r.user.name}</span>
                  <span className={`font-bold ${r.correct ? "text-emerald-600" : "text-rose-500"}`}>
                    {r.correct ? "✓ +0.5 pts" : "✗ 0 pts"}
                  </span>
                </div>
                {r.question && <p className="text-slate-500 mb-1">{r.question}</p>}
                {r.selected_option && (
                  <p className="text-slate-500">
                    Respondió: <span className={`font-semibold ${r.correct ? "text-emerald-700" : "text-rose-600"}`}>{r.selected_option}</span>
                    {!r.correct && r.correct_option && <> · Correcta: <span className="font-semibold text-emerald-700">{r.correct_option}</span></>}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
        checked ? "bg-emerald-600" : "bg-slate-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function DailyReminderSettingsCard() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);

  const load = () => {
    api.get("/daily-reminder-settings").then(({ data }) => setSettings(data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/daily-reminder-settings", { enabled: settings.enabled, message: settings.message });
      toast.success("Configuración guardada");
    } catch (err) {
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setSendingNow(true);
    try {
      const { data: matches } = await api.get("/matches");
      const colKey = (iso) => {
        const d = new Date(new Date(iso).getTime() - 5 * 3600000);
        return d.toISOString().slice(0, 10);
      };
      const today = colKey(new Date().toISOString());
      const count = (matches || []).filter((m) => m.match_date && colKey(m.match_date) === today).length;
      if (count === 0) {
        toast.error("No hay partidos programados para hoy");
        return;
      }
      const filled = settings.message.replace(/\{count\}/g, count);
      const result = await sendPushNotification({ title: "Polla Breve", body: filled, target: "all" });
      toast.success(`Enviada a ${result.sent} de ${result.total} suscritos (${count} partidos hoy)`);
    } catch (err) {
      toast.error(err.message || "No se pudo enviar");
    } finally {
      setSendingNow(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="card-surface p-6 max-w-xl animate-fade-up">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-600" />
          <h2 className="font-display font-bold text-lg text-slate-800">Recordatorio diario de partidos</h2>
        </div>
        <ToggleSwitch checked={settings.enabled} onChange={(v) => setSettings({ ...settings, enabled: v })} disabled={saving} />
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Usa <code className="bg-slate-100 px-1 rounded">{"{count}"}</code> en el mensaje — se reemplaza por la cantidad de partidos de hoy al enviar.
      </p>
      <textarea
        value={settings.message}
        onChange={(e) => setSettings({ ...settings, message: e.target.value })}
        rows={2}
        maxLength={200}
        className="form-input w-full text-sm resize-none mb-3"
        disabled={saving}
      />
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2">
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={sendNow}
          disabled={sendingNow || !settings.enabled}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> {sendingNow ? "Enviando…" : "Enviar ahora"}
        </button>
        {!settings.enabled && <span className="text-[11px] text-slate-400">Apagado — activa para poder enviar</span>}
      </div>
    </div>
  );
}

const DEFAULT_MOTIVATION_MESSAGE =
  "Estás a escasos {gap} puntos del primer lugar. El líder ya está mirando el retrovisor con pánico y empezó a sudar frío. No bajes el ritmo, que esa punta está que se cae... Tú llevas {user_points} pts y el líder {leader_points} pts.";

function MotivationSettingsCard() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [forceMode, setForceMode] = useState("none"); // "none" | "all" | "select"
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [forceSaving, setForceSaving] = useState(false);

  const load = () => {
    api.get("/motivation-settings").then(({ data }) => setSettings(data)).catch(() => {});
    api.get("/admin/users").then(({ data }) => setUsers(data || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/motivation-settings", {
        enabled: settings.enabled,
        message: settings.message,
        title: settings.title ?? "¡Está cerca!",
        threshold: settings.threshold,
      });
      toast.success("Configuración guardada");
    } catch (err) {
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const sendForced = async () => {
    if (forceMode === "none") return;
    setForceSaving(true);
    try {
      const targets = forceMode === "all" ? ["all"] : selectedUsers;
      if (targets.length === 0) { toast.error("Selecciona al menos un usuario"); return; }
      // Guarda mensaje, título Y force_targets juntos para que el modal use el texto actual
      await api.put("/motivation-settings", {
        message: settings.message,
        title: settings.title ?? "¡Está cerca!",
        threshold: settings.threshold,
        enabled: settings.enabled,
        force_targets: targets,
      });
      toast.success(forceMode === "all" ? "Modal activado para todos — verán el mensaje la próxima vez que entren" : `Modal activado para ${targets.length} usuario(s)`);
      setForceMode("none");
      setSelectedUsers([]);
    } catch (err) {
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setForceSaving(false);
    }
  };

  const toggleUser = (id) =>
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (!settings) return null;

  return (
    <div className="card-surface p-6 max-w-xl animate-fade-up space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-500" />
          <h2 className="font-display font-bold text-lg text-slate-800">Mensaje "vas cerca del líder"</h2>
        </div>
        <ToggleSwitch checked={settings.enabled} onChange={(v) => setSettings({ ...settings, enabled: v })} disabled={saving} />
      </div>
      <p className="text-sm text-slate-400">
        Aparece como modal (con animación) 1 vez al día a quien esté a {settings.threshold} puntos o menos del líder.
        Usa <code className="bg-slate-100 px-1 rounded">{"{gap}"}</code>, <code className="bg-slate-100 px-1 rounded">{"{user_points}"}</code> y{" "}
        <code className="bg-slate-100 px-1 rounded">{"{leader_points}"}</code>.
      </p>

      {/* Threshold */}
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">Diferencia máxima de puntos</label>
        <input
          type="number" min={1} value={settings.threshold}
          onChange={(e) => setSettings({ ...settings, threshold: e.target.value })}
          className="form-input w-24 text-sm" disabled={saving}
        />
      </div>

      {/* Título */}
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">Título del modal</label>
        <input
          type="text"
          value={settings.title ?? "¡Está cerca!"}
          onChange={(e) => setSettings({ ...settings, title: e.target.value })}
          maxLength={60}
          placeholder="ej. ¡Está cerca!"
          className="form-input w-full text-sm"
          disabled={saving}
        />
      </div>

      {/* Mensaje */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-500">Mensaje</label>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, message: DEFAULT_MOTIVATION_MESSAGE })}
            className="text-[11px] text-sky-600 hover:text-sky-800 underline"
          >
            Restaurar texto original
          </button>
        </div>
        <textarea
          value={settings.message}
          onChange={(e) => setSettings({ ...settings, message: e.target.value })}
          rows={3} maxLength={300}
          className="form-input w-full text-sm resize-none"
          disabled={saving}
        />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2">
        {saving ? "Guardando…" : "Guardar"}
      </button>

      {/* Forzar modal a usuarios específicos */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <div>
          <p className="text-xs font-bold text-slate-600 mb-1">Forzar modal ahora</p>
          <p className="text-xs text-slate-400">El modal aparecerá la próxima vez que entren, sin importar su puntaje.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["none","all","select"].map(mode => (
            <button
              key={mode}
              onClick={() => setForceMode(mode)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                forceMode === mode
                  ? "bg-rose-500 border-rose-500 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-rose-300"
              }`}
            >
              {mode === "none" ? "No forzar" : mode === "all" ? "Todos" : "Elegir usuarios"}
            </button>
          ))}
        </div>

        {forceMode === "select" && (
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {users.filter(u => u.role !== "admin").map(u => (
              <button
                key={u.id}
                onClick={() => toggleUser(u.id)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  selectedUsers.includes(u.id)
                    ? "bg-rose-100 border-rose-400 text-rose-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-rose-200"
                }`}
              >
                {u.name} {!u.paid && <span className="text-amber-500 ml-1">· pendiente</span>}
              </button>
            ))}
          </div>
        )}

        {forceMode !== "none" && (
          <button
            onClick={sendForced}
            disabled={forceSaving || (forceMode === "select" && selectedUsers.length === 0)}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            {forceSaving ? "Guardando…" : forceMode === "all" ? "Activar para todos" : `Activar para ${selectedUsers.length} usuario(s)`}
          </button>
        )}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetUserId, setTargetUserId] = useState("all");
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    api.get("/admin/users").then(({ data }) => setUsers(data || [])).catch(() => {});
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Escribe título y mensaje");
      return;
    }
    setSending(true);
    setLastResult(null);
    setLastError(null);
    try {
      const result = await sendPushNotification({
        title: title.trim(),
        body: body.trim(),
        target: targetUserId,
      });
      setLastResult(result);
      toast.success(`Enviada a ${result.sent} de ${result.total} suscritos`);
      setTitle("");
      setBody("");
    } catch (err) {
      setLastError(err.message || "Error desconocido");
      toast.error(err.message || "No se pudo enviar la notificación");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
    <div className="card-surface p-6 max-w-xl animate-fade-up">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-5 h-5 text-emerald-600" />
        <h2 className="font-display font-bold text-xl text-slate-800">Enviar notificación push</h2>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        Llega a los usuarios que hayan activado las notificaciones (la campana 🔔 del header), aunque tengan el navegador cerrado.
      </p>
      <form onSubmit={send} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Enviar a</label>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="form-input w-full text-sm cursor-pointer"
            disabled={sending}
          >
            <option value="all">Todos los usuarios</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ej. ¡Hoy hay 6 partidos!"
            maxLength={60}
            className="form-input w-full text-sm"
            disabled={sending}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Mensaje</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="ej. No olvides poner tus pronósticos antes de que empiecen."
            maxLength={200}
            rows={3}
            className="form-input w-full text-sm resize-none"
            disabled={sending}
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Send className="w-4 h-4" />
          {sending ? "Enviando…" : targetUserId === "all" ? "Enviar a todos" : "Enviar"}
        </button>
      </form>

      {lastResult && (
        <div className="mt-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
          Última vez: <strong className="text-slate-700">{lastResult.sent}</strong> enviadas,{" "}
          <strong className="text-slate-700">{lastResult.failed}</strong> fallidas, de{" "}
          <strong className="text-slate-700">{lastResult.total}</strong> suscritos.
        </div>
      )}
      {lastError && (
        <div className="mt-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
          <strong>Error:</strong> {lastError}
        </div>
      )}
    </div>

    <DailyReminderSettingsCard />
    <MotivationSettingsCard />
    <BonusGradingCard />
    </div>
  );
}

const BONUS_TYPES_DEF = [
  { type: "champion",        label: "Campeón del Mundial",        pts: 5 },
  { type: "runner_up",       label: "Subcampeón del Mundial",     pts: 3 },
  { type: "top_scorer",      label: "Goleador del torneo",        pts: 3 },
  { type: "best_player",     label: "Mejor jugador del torneo",   pts: 3 },
  { type: "best_goalkeeper", label: "Mejor arquero del torneo",   pts: 3 },
];

function BonusGradingCard() {
  const [values, setValues] = useState({
    champion: "", runner_up: "", top_scorer: "", best_player: "", best_goalkeeper: ""
  });
  const [submitted, setSubmitted] = useState({});
  const [busy, setBusy] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/admin/bonus/official").catch(() => ({ data: {} })),
      api.get("/admin/bonus/submitted").catch(() => ({ data: {} })),
    ]).then(([{ data: official }, { data: sub }]) => {
      setSubmitted(sub || {});
      if (official && Object.keys(official).length > 0) {
        setValues(v => ({ ...v, ...official }));
        setGraded(true);
      }
    });
  }, []);

  const handleGrade = async () => {
    const filled = Object.values(values).some(v => v.trim());
    if (!filled) { toast.error("Selecciona al menos un resultado"); return; }
    setBusy(true);
    try {
      await api.post("/admin/bonus/grade", values);
      toast.success("¡Bonus calificados! El ranking se actualiza automáticamente.");
      setGraded(true);
    } catch (err) {
      toast.error(err?.message || "Error al calificar bonus");
    } finally {
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    if (!window.confirm("¿Seguro que quieres revertir todos los puntos bonus? Esta acción quitará los puntos asignados.")) return;
    setReverting(true);
    try {
      await api.post("/admin/bonus/revert", {});
      toast.success("Puntos bonus revertidos.");
      setValues({ champion: "", runner_up: "", top_scorer: "", best_player: "", best_goalkeeper: "" });
      setGraded(false);
    } catch (err) {
      toast.error(err?.message || "Error al revertir");
    } finally {
      setReverting(false);
    }
  };

  const clear = (type) => setValues(v => ({ ...v, [type]: "" }));

  return (
    <div className="card-surface p-5 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-black text-lg text-slate-900">🏆 Calificar Bonus Final</h3>
        {graded && (
          <button
            onClick={handleRevert}
            disabled={reverting}
            className="text-xs font-bold text-rose-500 hover:text-rose-700 border border-rose-200 hover:border-rose-400 px-3 py-1 rounded-lg transition-colors"
          >
            {reverting ? "Revirtiendo…" : "Revertir todo"}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-4">Selecciona los ganadores oficiales. Los puntos se asignan automáticamente a todos los participantes.</p>
      <div className="space-y-3">
        {BONUS_TYPES_DEF.map(({ type, label, pts }) => (
          <div key={type} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <label className="text-sm text-slate-600 w-52 shrink-0">
              {label} <span className="text-emerald-600 font-bold">+{pts}pts</span>
            </label>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <select
                value={values[type]}
                onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                disabled={busy || reverting}
                className="input-field flex-1 text-sm appearance-none bg-white"
              >
                <option value="">— Seleccionar ganador —</option>
                {(submitted[type] || []).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {values[type] && (
                <button
                  onClick={() => clear(type)}
                  title="Limpiar selección"
                  className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleGrade}
        disabled={busy || reverting}
        className="btn-primary w-full mt-5 text-sm"
      >
        {busy ? "Calificando…" : graded ? "Actualizar calificación" : "Calificar y actualizar ranking"}
      </button>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("matches");
  const [syncing, setSyncing] = useState(false);
  const { onlineUsers, onlineCount } = useLive();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await triggerSync();
      if (result.synced > 0) {
        toast.success(`Sync completado: ${result.synced} partido(s) actualizado(s), ${result.pointsUpdated} pronósticos con puntos`);
      } else {
        toast.success("Sync completado — sin partidos nuevos finalizados");
      }
      console.log("Sync log:", result.log);
    } catch (err) {
      toast.error(`Error en sync: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const tabBtn = (key, icon, label, testId) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      data-testid={testId}
      className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-all ${
        tab === key
          ? "bg-emerald-600 border border-emerald-600 text-white shadow-sm"
          : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8 animate-fade-up flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="label-eyebrow">Panel administrador</span>
            <h1 className="font-display font-black text-3xl sm:text-4xl mt-0.5 tracking-tight text-slate-900">
              Gestión Mundial 2026
            </h1>
            <p className="text-slate-400 text-sm mt-1">Resultados, inscritos y pronósticos.</p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2 text-sm self-center"
          title="Sincronizar resultados desde football-data.org"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Sync resultados"}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {tabBtn("matches", <Trophy className="w-4 h-4" />, "Partidos", "admin-tab-matches")}
        {tabBtn("users", <Users className="w-4 h-4" />, "Inscritos", "admin-tab-users")}
        {tabBtn("predictions", <ClipboardList className="w-4 h-4" />, "Pronósticos", "admin-tab-predictions")}
        {tabBtn("trivia", <HelpCircle className="w-4 h-4" />, "Trivia", "admin-tab-trivia")}
        {tabBtn("notifications", <Bell className="w-4 h-4" />, "Notificaciones", "admin-tab-notifications")}
      </div>

      {tab === "matches" ? <MatchesTab /> :
       tab === "users" ? <UsersTab onlineUsers={onlineUsers} onlineCount={onlineCount} /> :
       tab === "trivia" ? <TriviaStatusTab /> :
       tab === "notifications" ? <NotificationsTab /> :
       <PredictionsTab />}
    </div>
  );
}
