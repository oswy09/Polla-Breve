import { useState, useEffect } from "react";
import { api, getInitials } from "../lib/api";
import {
  Target, Trophy, Brain, TrendingUp, TrendingDown,
  Ghost, AlertCircle, Crown, Flame, Award, Clock, Minus
} from "lucide-react";

function Avatar({ user }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-xs shrink-0">
      {getInitials(user.name)}
    </div>
  );
}

function StatCard({
  icon: Icon, iconColor, title, subtitle, users, valueKey,
  valueSuffix = "", valueLabel, emptyText, reverse = false,
  winnerIcon: WinnerIcon,
}) {
  const sorted = [...users]
    .filter(u => u[valueKey] > 0)
    .sort((a, b) => reverse ? a[valueKey] - b[valueKey] : b[valueKey] - a[valueKey]);

  if (sorted.length === 0) {
    return (
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{title}</div>
            {subtitle && <div className="text-[11px] text-slate-400">{subtitle}</div>}
          </div>
        </div>
        <p className="text-sm text-slate-400 italic">{emptyText || "Sin datos aún"}</p>
      </div>
    );
  }

  const topValue = sorted[0][valueKey];
  const winners = sorted.filter(u => u[valueKey] === topValue);
  const rest = sorted.filter(u => u[valueKey] !== topValue).slice(0, 3);
  const W = WinnerIcon || Crown;

  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">{title}</div>
          {subtitle && <div className="text-[11px] text-slate-400">{subtitle}</div>}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {winners.map((u, i) => (
          <div key={u.id} className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {winners.length === 1
              ? <W className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              : <span className="text-[10px] font-bold text-emerald-600 w-4 shrink-0">{i + 1}</span>
            }
            <Avatar user={u} />
            <span className="font-semibold text-slate-800 text-sm truncate flex-1">{u.name}</span>
            <span className="font-display font-black text-emerald-700 text-base shrink-0">
              {u[valueKey]}{valueSuffix}
            </span>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((u, i) => (
            <div key={u.id} className="flex items-center gap-2 px-2 py-1">
              <span className="text-[11px] text-slate-400 w-4 text-center shrink-0">{winners.length + i + 1}</span>
              <Avatar user={u} />
              <span className="text-xs text-slate-600 truncate flex-1">{u.name}</span>
              <span className="text-xs font-semibold text-slate-500 shrink-0">{u[valueKey]}{valueSuffix}</span>
            </div>
          ))}
        </div>
      )}

      {valueLabel && <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">{valueLabel}</p>}
    </div>
  );
}

function OlvidadizoCard({ users, finalizedCount }) {
  const withMissed = users
    .map(u => ({ ...u, missed: Math.max(0, finalizedCount - u.finPredCount) }))
    .filter(u => u.missed > 0)
    .sort((a, b) => b.missed - a.missed);

  if (withMissed.length === 0) {
    return (
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
            <Ghost className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">El más olvidadizo</div>
            <div className="text-[11px] text-slate-400">Menos pronósticos diligenciados</div>
          </div>
        </div>
        <p className="text-sm text-slate-400 italic">¡Todos han pronosticado bien!</p>
      </div>
    );
  }

  const topMissed = withMissed[0].missed;
  const winners = withMissed.filter(u => u.missed === topMissed);
  const rest = withMissed.filter(u => u.missed !== topMissed).slice(0, 3);

  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
          <Ghost className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">El más olvidadizo</div>
          <div className="text-[11px] text-slate-400">Menos pronósticos diligenciados</div>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {winners.map((u, i) => (
          <div key={u.id} className="flex items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            {winners.length === 1 ? <Ghost className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <span className="text-[10px] font-bold text-orange-500 w-4 shrink-0">{i + 1}</span>}
            <Avatar user={u} />
            <span className="font-semibold text-slate-800 text-sm truncate flex-1">{u.name}</span>
            <div className="text-right shrink-0">
              <div className="font-display font-black text-orange-600 text-base">{u.missed}</div>
              <div className="text-[10px] text-slate-400">perdidos</div>
            </div>
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((u, i) => (
            <div key={u.id} className="flex items-center gap-2 px-2 py-1">
              <span className="text-[11px] text-slate-400 w-4 text-center shrink-0">{winners.length + i + 1}</span>
              <Avatar user={u} />
              <span className="text-xs text-slate-600 truncate flex-1">{u.name}</span>
              <span className="text-xs font-semibold text-slate-500 shrink-0">{u.missed} perdidos</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-3">Partidos finalizados sin pronóstico registrado</p>
    </div>
  );
}

function TibiosCard({ users, totalUsers }) {
  // "Tibios": least variation in position AND avg in middle (not top 10%, not bottom 10%)
  const topCut = Math.ceil(totalUsers * 0.15);
  const botCut = Math.floor(totalUsers * 0.85);

  const candidates = users
    .filter(u => u.positionRange > 0 && u.avgPosition > topCut && u.avgPosition <= botCut)
    .sort((a, b) => a.positionRange - b.positionRange || a.avgPosition - b.avgPosition);

  if (candidates.length === 0) {
    return (
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
            <Minus className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">Los más tibios</div>
            <div className="text-[11px] text-slate-400">Ni suben ni bajan — siempre en media tabla</div>
          </div>
        </div>
        <p className="text-sm text-slate-400 italic">Sin datos suficientes aún</p>
      </div>
    );
  }

  const top = candidates.slice(0, 3);

  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
          <Minus className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">Los más tibios</div>
          <div className="text-[11px] text-slate-400">Ni suben ni bajan — siempre en media tabla</div>
        </div>
      </div>
      <div className="space-y-2">
        {top.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${i === 0 ? "bg-slate-50 border-slate-200" : "border-transparent"}`}>
            <span className="text-[10px] font-bold text-slate-400 w-4 text-center shrink-0">{i + 1}</span>
            <Avatar user={u} />
            <span className="font-semibold text-slate-700 text-sm truncate flex-1">{u.name}</span>
            <div className="text-right shrink-0">
              <div className="font-display font-black text-slate-500 text-sm">±{u.positionRange}</div>
              <div className="text-[10px] text-slate-400">variación</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-3">Menor variación de posición · promedio puesto {top[0]?.avgPosition}</p>
    </div>
  );
}

function AnticipadorCard({ users }) {
  // Users who submit predictions earliest before kickoff (avg minutes before match)
  const eligible = users
    .filter(u => u.anticipadoCount >= 3 && u.avgMinsBefore > 0)
    .sort((a, b) => b.avgMinsBefore - a.avgMinsBefore);

  const fmtTime = (mins) => {
    if (mins >= 1440) return `${Math.round(mins / 1440)}d antes`;
    if (mins >= 60) return `${Math.round(mins / 60)}h antes`;
    return `${mins}min antes`;
  };

  if (eligible.length === 0) {
    return (
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">El más anticipado</div>
            <div className="text-[11px] text-slate-400">Siempre coloca su pronóstico antes de que empiece</div>
          </div>
        </div>
        <p className="text-sm text-slate-400 italic">Sin datos suficientes aún</p>
      </div>
    );
  }

  const top = eligible.slice(0, 4);
  const topValue = top[0].avgMinsBefore;
  const winners = top.filter(u => u.avgMinsBefore === topValue);
  const rest = top.filter(u => u.avgMinsBefore !== topValue);

  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">El más anticipado</div>
          <div className="text-[11px] text-slate-400">Siempre coloca su pronóstico antes de que empiece</div>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {winners.map((u, i) => (
          <div key={u.id} className="flex items-center gap-2.5 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
            {winners.length === 1 ? <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" /> : <span className="text-[10px] font-bold text-sky-600 w-4 shrink-0">{i + 1}</span>}
            <Avatar user={u} />
            <span className="font-semibold text-slate-800 text-sm truncate flex-1">{u.name}</span>
            <span className="font-display font-black text-sky-700 text-sm shrink-0">{fmtTime(u.avgMinsBefore)}</span>
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((u, i) => (
            <div key={u.id} className="flex items-center gap-2 px-2 py-1">
              <span className="text-[11px] text-slate-400 w-4 text-center shrink-0">{winners.length + i + 1}</span>
              <Avatar user={u} />
              <span className="text-xs text-slate-600 truncate flex-1">{u.name}</span>
              <span className="text-xs font-semibold text-slate-500 shrink-0">{fmtTime(u.avgMinsBefore)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-3">Promedio de tiempo con antelación al inicio del partido · mín. 3 pronósticos</p>
    </div>
  );
}

export default function Estadisticas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/estadisticas")
      .then(({ data: d }) => setData(d))
      .catch(e => setError(e?.response?.data?.detail || "Error cargando estadísticas"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-slate-400 text-sm">
        Cargando estadísticas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="card-surface p-5 border-l-4 border-l-rose-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const { users = [], totalMatches = 0, finalizedCount = 0, totalUsers = 0 } = data || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <span className="label-eyebrow">Polla Breve · FIFA 2026</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1 tracking-tight text-slate-900">
          Estadísticas
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {finalizedCount} de {totalMatches} partidos finalizados · {users.length} participantes
        </p>
      </div>

      {/* Pronósticos */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-lg text-slate-700 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" /> Pronósticos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={Target}
            iconColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
            title="Más exactos"
            subtitle="Resultados exactos acertados"
            users={users}
            valueKey="exactos"
            valueLabel="Marcó el resultado exacto (ej. 2-1)"
          />
          <StatCard
            icon={Award}
            iconColor="bg-blue-50 text-blue-600 border border-blue-100"
            title="Más ganadores"
            subtitle="Ganador correcto (sin exacto)"
            users={users}
            valueKey="ganadores"
            valueLabel="Acertó el ganador o el empate, sin resultado exacto"
          />
          <OlvidadizoCard users={users} finalizedCount={finalizedCount} />
          <StatCard
            icon={Ghost}
            iconColor="bg-slate-100 text-slate-500 border border-slate-200"
            title="Más en limbo"
            subtitle="Cero puntos en partidos finalizados"
            users={users}
            valueKey="zeroPts"
            winnerIcon={Ghost}
            valueLabel="Partidos donde no acertó nada (0 pts)"
          />
          <StatCard
            icon={Flame}
            iconColor="bg-rose-50 text-rose-500 border border-rose-100"
            title="Se le escapó"
            subtitle="Marcó un gol correcto pero no el ganador"
            users={users}
            valueKey="onePts"
            winnerIcon={Flame}
            valueLabel="Acertó 1 marcador parcial (1 pt) — siempre cerca pero nunca"
          />
          <AnticipadorCard users={users} />
        </div>
      </section>

      {/* Ranking */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-lg text-slate-700 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Ranking
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={Crown}
            iconColor="bg-yellow-50 text-yellow-600 border border-yellow-100"
            title="Más días en 1er lugar"
            subtitle="Quién ha liderado el ranking más jornadas"
            users={users}
            valueKey="daysAtFirst"
            valueSuffix=" días"
            emptyText="Aún no hay jornadas finalizadas"
          />
          <StatCard
            icon={TrendingUp}
            iconColor="bg-teal-50 text-teal-600 border border-teal-100"
            title="Mayor escalada"
            subtitle="Más posiciones subidas desde jornada 1"
            users={users}
            valueKey="climb"
            valueSuffix=" pos."
            valueLabel="Diferencia de posición entre la primera jornada y la actual"
            emptyText="Se necesitan al menos 2 jornadas finalizadas"
          />
          <StatCard
            icon={TrendingDown}
            iconColor="bg-red-50 text-red-500 border border-red-100"
            title="Mayor caída"
            subtitle="Más posiciones bajadas desde jornada 1"
            users={users}
            valueKey="drop"
            valueSuffix=" pos."
            winnerIcon={TrendingDown}
            valueLabel="Ha retrocedido más posiciones desde su inicio"
            emptyText="Se necesitan al menos 2 jornadas finalizadas"
          />
          <StatCard
            icon={Crown}
            iconColor="bg-slate-100 text-slate-500 border border-slate-200"
            title="Más días en últimas posiciones"
            subtitle="Más jornadas en el tercio inferior del ranking"
            users={users}
            valueKey="daysAtBottom"
            valueSuffix=" días"
            winnerIcon={TrendingDown}
            emptyText="Sin datos aún"
          />
          <TibiosCard users={users} totalUsers={totalUsers || users.length} />
        </div>
      </section>

      {/* Trivia */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-lg text-slate-700 flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500" /> Trivia
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={Brain}
            iconColor="bg-amber-50 text-amber-600 border border-amber-100"
            title="Maestro del quiz"
            subtitle="Más respuestas correctas de trivia"
            users={users}
            valueKey="triviaCorrect"
            valueSuffix=" ✓"
            emptyText="Nadie ha respondido trivia aún"
          />
        </div>
      </section>
    </div>
  );
}
