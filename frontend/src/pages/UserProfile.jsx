import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, getInitials, formatDate, uploadMyAvatar } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Trophy, ArrowLeft, Target, Zap, Minus, CheckCircle, XCircle, TrendingUp, ClipboardList, HelpCircle, Camera, Pencil, Check, X as XIcon, Calendar,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "emerald" }) {
  const colors = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    blue:    "bg-blue-50 border-blue-100 text-blue-600",
    amber:   "bg-amber-50 border-amber-100 text-amber-600",
    rose:    "bg-rose-50 border-rose-100 text-rose-500",
    slate:   "bg-slate-50 border-slate-200 text-slate-500",
    indigo:  "bg-indigo-50 border-indigo-100 text-indigo-600",
  };
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <div className="font-display font-black text-2xl">{value}</div>
      {sub && <div className="text-[11px] opacity-60">{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <div className="font-bold text-slate-700 mb-1">{label}</div>
      <div className="text-emerald-600 font-bold">#{d?.position} de {d?.total}</div>
      <div className="text-slate-500">{d?.points} pts</div>
    </div>
  );
}

// Formatea "2026-06-12" → "Jun 12"
function fmtDay(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("es", { month: "short", day: "numeric" });
}

// Convierte un ISO a fecha (YYYY-MM-DD) en hora Colombia (UTC-5)
function colDateKey(iso) {
  const d = new Date(new Date(iso).getTime() - 5 * 3600000);
  return d.toISOString().slice(0, 10);
}

const TRIVIA_START = new Date("2026-06-11T00:00:00Z").getTime();
function triviaDayNum(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.floor((d - TRIVIA_START) / 86400000) + 1;
}

// Combina pronósticos (con puntos) y trivia (con puntos) en una línea de tiempo por día
function buildHistory(predictions, trivias) {
  const days = new Map(); // dateKey -> { matches: [], trivia: null }

  for (const p of predictions || []) {
    const m = p.match;
    if (m.status !== "finalized" || p.points == null) continue;
    const key = colDateKey(m.match_date);
    if (!days.has(key)) days.set(key, { matches: [], trivia: null });
    days.get(key).matches.push({
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      pred_home: p.prediction?.pred_home,
      pred_away: p.prediction?.pred_away,
      points: p.points,
    });
  }

  for (const t of trivias || []) {
    if (t.hide_today) continue;
    const key = t.answered_date;
    if (!days.has(key)) days.set(key, { matches: [], trivia: null });
    days.get(key).trivia = {
      question: t.question,
      is_correct: t.is_correct,
      points: t.is_correct ? 0.5 : 0,
    };
  }

  const sortedKeys = Array.from(days.keys()).sort();
  let running = 0;
  return sortedKeys.map((key) => {
    const entry = days.get(key);
    const matchPts = entry.matches.reduce((s, m) => s + m.points, 0);
    const triviaPts = entry.trivia?.points || 0;
    const dayTotal = matchPts + triviaPts;
    running += dayTotal;
    return { day: key, ...entry, dayTotal, running };
  });
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me, refresh: refreshAuth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("performance"); // "performance" | "predictions" | "trivia"
  const [predictions, setPredictions] = useState(null);
  const [trivias, setTrivias] = useState(null);
  const [loadingTab, setLoadingTab] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const updated = await uploadMyAvatar(file);
      setData(prev => ({ ...prev, profile: { ...prev.profile, avatar_url: updated.avatar_url } }));
      await refreshAuth();
      toast.success("Foto actualizada");
    } catch (err) {
      toast.error(err.message || "No se pudo subir la foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEditName = () => {
    setNameInput(data.profile.name);
    setEditingName(true);
  };

  const saveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await api.put("/profile/me", { name: nameInput.trim() });
      setData(prev => ({ ...prev, profile: { ...prev.profile, name: nameInput.trim() } }));
      await refreshAuth();
      setEditingName(false);
      toast.success("Nombre actualizado");
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el nombre");
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    api.get(`/users/${userId}/profile`)
      .then(({ data: d }) => setData(d))
      .catch(err => setError(err.message || "Error al cargar el perfil"))
      .finally(() => setLoading(false));
  }, [userId]);

  const loadTab = async (t) => {
    setTab(t);
    if (t === "predictions" && predictions === null) {
      setLoadingTab(true);
      api.get(`/users/${userId}/predictions`)
        .then(({ data: d }) => setPredictions(d || []))
        .finally(() => setLoadingTab(false));
    }
    if (t === "trivia" && trivias === null) {
      setLoadingTab(true);
      api.get(`/users/${userId}/trivia`)
        .then(({ data: d }) => setTrivias(d || []))
        .finally(() => setLoadingTab(false));
    }
    if (t === "history" && (predictions === null || trivias === null)) {
      setLoadingTab(true);
      Promise.all([
        predictions === null ? api.get(`/users/${userId}/predictions`) : Promise.resolve({ data: predictions }),
        trivias === null ? api.get(`/users/${userId}/trivia`) : Promise.resolve({ data: trivias }),
      ])
        .then(([{ data: p }, { data: t }]) => {
          setPredictions(p || []);
          setTrivias(t || []);
        })
        .finally(() => setLoadingTab(false));
    }
  };

  const history = (predictions && trivias) ? buildHistory(predictions, trivias) : [];

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">
        Cargando perfil…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-rose-500">
        {error || "Usuario no encontrado"}
      </div>
    );
  }

  const { profile, currentPoints, currentRank, totalUsers, stats, performanceData } = data;
  const isMe = me && me.id === userId;

  // Para la gráfica: invertir eje Y (posición 1 = arriba)
  const chartData = performanceData.map(d => ({
    ...d,
    label: fmtDay(d.day),
    // invertimos para que mejor posición quede arriba
    posChart: d.total - d.position + 1,
  }));

  const bestPosition = performanceData.length
    ? Math.min(...performanceData.map(d => d.position))
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Hero card */}
      <div className="card-surface p-6 flex items-center gap-5">
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-16 h-16 rounded-full object-cover shadow-md border border-slate-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-600 text-white font-display font-black text-2xl flex items-center justify-center shadow-md">
              {getInitials(profile.name)}
            </div>
          )}
          {isMe && (
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
              {uploadingAvatar ? (
                <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="form-input !py-1.5 !text-xl font-display font-black max-w-xs"
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              />
              <button onClick={saveName} disabled={savingName} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 truncate flex items-center gap-2">
              {profile.name}
              {isMe && <span className="text-emerald-500 text-base">(tú)</span>}
              {isMe && (
                <button onClick={startEditName} className="text-slate-300 hover:text-emerald-600 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </h1>
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <Trophy className="w-4 h-4" /> {currentPoints} pts
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500 font-semibold">
              Puesto #{currentRank} de {totalUsers}
            </span>
            {bestPosition && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-amber-600 font-bold">
                  Mejor posición: #{bestPosition}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Target}       label="Exactos"    value={stats.exactos}    color="emerald" sub="resultado exacto" />
        <StatCard icon={Trophy}       label="Ganador"    value={stats.ganadores}  color="blue"    sub="acertó el ganador" />
        <StatCard icon={Zap}          label="Parciales"  value={stats.parciales}  color="amber"   sub="acertó un marcador" />
        <StatCard icon={Minus}        label="Sin acierto" value={stats.sinAcierto} color="slate"  sub="de partidos" />
        <StatCard icon={CheckCircle}  label="Trivia ✓"   value={stats.triviaCorrect} color="indigo" sub={`de ${stats.triviaTotal} días`} />
        <StatCard icon={XCircle}      label="Trivia ✗"   value={stats.triviaTotal - stats.triviaCorrect} color="rose" sub="incorrectas" />
      </div>

      {/* Tabs */}
      <div className="card-surface overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1">
          {[
            { id: "performance", label: "Desempeño",  icon: TrendingUp },
            { id: "history",     label: "Historial",   icon: Calendar },
            { id: "predictions", label: "Pronósticos", icon: ClipboardList },
            { id: "trivia",      label: "Trivia",      icon: HelpCircle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => loadTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-lg transition-all ${
                tab === id
                  ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── TAB: Desempeño ── */}
          {tab === "performance" && (
            <>
              <p className="text-xs text-slate-400 mb-4">Posición en el ranking día a día — arriba es mejor</p>
              {performanceData.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Aún no hay partidos finalizados para mostrar el desempeño.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[1, totalUsers]} reversed tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v => `#${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={1} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.4} />
                      <Line type="monotone" dataKey="position" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#059669" }} />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-slate-100">
                          <th className="py-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Fecha</th>
                          <th className="py-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 text-right">Puntos</th>
                          <th className="py-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 text-right">Posición</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...performanceData].reverse().map((d, i) => (
                          <tr key={d.day} className={`border-b border-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                            <td className="py-2.5 text-slate-600 font-medium">{fmtDay(d.day)}</td>
                            <td className="py-2.5 text-right font-display font-bold text-emerald-600">{d.points}</td>
                            <td className="py-2.5 text-right">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                                d.position === 1 ? "bg-yellow-100 text-yellow-700" :
                                d.position <= 3 ? "bg-slate-100 text-slate-600" :
                                "bg-slate-50 text-slate-400"
                              }`}>{d.position}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── TAB: Historial ── */}
          {tab === "history" && (
            loadingTab ? (
              <div className="text-center py-10 text-slate-400 text-sm">Cargando…</div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Aún no hay partidos finalizados ni trivias respondidas.
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-4">Cómo fue sumando puntos día por día, partido por partido</p>
                <div className="space-y-4">
                  {history.map((d) => (
                    <div key={d.day} className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-600">{fmtDay(d.day)}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs font-display font-black ${d.dayTotal > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                            {d.dayTotal > 0 ? "+" : ""}{d.dayTotal} pts del día
                          </span>
                          <span className="text-[11px] text-slate-400">
                            acumulado: <span className="font-bold text-slate-600">{d.running}</span>
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {d.matches.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-700 truncate">
                                {m.home_team} <span className="text-slate-300 text-xs">vs</span> {m.away_team}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Real: <span className="font-semibold text-slate-500">{m.home_score}-{m.away_score}</span>
                                {" · "}Tu pronóstico: <span className="font-semibold text-slate-500">{m.pred_home}-{m.pred_away}</span>
                              </div>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              m.points === 3 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                              m.points === 2 ? "bg-blue-50 border-blue-200 text-blue-700" :
                              m.points === 1 ? "bg-amber-50 border-amber-200 text-amber-700" :
                              "bg-slate-50 border-slate-200 text-slate-500"
                            }`}>
                              +{m.points} pt
                            </span>
                          </div>
                        ))}
                        {d.trivia && (
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-sm font-semibold text-slate-700 truncate">
                                Trivia — Día {triviaDayNum(d.day)}
                              </span>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              d.trivia.is_correct
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-rose-50 border-rose-100 text-rose-600"
                            }`}>
                              {d.trivia.is_correct ? "✓ +0.5 pt" : "✗ 0 pt"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          {/* ── TAB: Pronósticos ── */}
          {tab === "predictions" && (
            loadingTab ? (
              <div className="text-center py-10 text-slate-400 text-sm">Cargando…</div>
            ) : !predictions || predictions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">Sin pronósticos registrados.</div>
            ) : (
              <div className="space-y-2">
                {predictions.map((p) => {
                  const m = p.match;
                  const hasPred = p.prediction != null;
                  const isVisible = p.is_visible;
                  const isFinalized = m.status === "finalized";
                  return (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {m.group_name ? `Grupo ${m.group_name}` : m.ronda || ""}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0 text-sm font-semibold text-slate-800">
                          <span className="truncate max-w-[80px] sm:max-w-[130px]">{m.home_team}</span>
                          <span className="text-slate-300 text-xs shrink-0">vs</span>
                          <span className="truncate max-w-[80px] sm:max-w-[130px]">{m.away_team}</span>
                        </div>
                        {isFinalized && (
                          <div className="text-[10.5px] text-slate-400 mt-0.5">
                            Resultado: <span className="font-bold text-slate-600">{m.home_score} – {m.away_score}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-display font-bold text-sm ${hasPred ? "text-emerald-600" : "text-slate-300"}`}>
                          {hasPred
                            ? `${p.prediction.pred_home} – ${p.prediction.pred_away}`
                            : !isVisible && p.has_prediction ? "🔒" : "—"}
                        </span>
                        {isFinalized && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            p.points === 3 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            p.points === 2 ? "bg-blue-50 border-blue-200 text-blue-700" :
                            p.points === 1 ? "bg-amber-50 border-amber-200 text-amber-700" :
                            "bg-slate-50 border-slate-200 text-slate-500"
                          }`}>
                            {p.points ?? 0} pt
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── TAB: Trivia ── */}
          {tab === "trivia" && (
            loadingTab ? (
              <div className="text-center py-10 text-slate-400 text-sm">Cargando…</div>
            ) : !trivias || trivias.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No hay trivias respondidas.</div>
            ) : (
              <div className="space-y-2">
                {[...trivias].sort((a, b) => a.answered_date.localeCompare(b.answered_date)).map((t) => {
                  const dayNum = Math.floor((new Date(t.answered_date + "T00:00:00Z") - new Date("2026-06-11T00:00:00Z")) / 86400000) + 1;
                  return (
                    <div key={t.question_id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Pregunta — Día {dayNum}
                      </div>
                      <div>
                        {t.hide_today ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">🔒 Oculto</span>
                        ) : t.is_correct ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">✓ +0.5 pt</span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600">✗ 0 pt</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

    </div>
  );
}
