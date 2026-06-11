import { Trophy, Star, Target, Clock, Lock, Gift, HelpCircle, XCircle } from "lucide-react";

const REGLAS = [
  {
    icon: Target,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    title: "Marcador exacto",
    pts: "+3 pts",
    desc: "Aciertas el resultado exacto del partido. Ejemplo: predices 2-1 y el resultado es 2-1.",
  },
  {
    icon: Trophy,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    title: "Ganador o empate correcto",
    pts: "+2 pts",
    desc: "Aciertas quién gana o que el partido termina empatado, pero no el marcador exacto.",
  },
  {
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-200",
    title: "Acierto parcial de goles",
    pts: "+1 pt",
    desc: "Aciertas la cantidad de goles de uno de los equipos, pero no el ganador ni el empate. Ejemplo: predices 2-2 y el partido queda 2-0 (aciertas los 2 goles del local).",
  },
  {
    icon: XCircle,
    color: "text-slate-400",
    bg: "bg-slate-50 border-slate-200",
    title: "Sin acierto",
    pts: "0 pts",
    desc: "Tu pronóstico no coincide con el resultado, el ganador ni con los goles de ningún equipo.",
  },
  {
    icon: Lock,
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    title: "Cierre de pronósticos",
    pts: "⏰",
    desc: "Los pronósticos se cierran automáticamente 5 minutos antes del inicio de cada partido. No se pueden modificar después.",
  },
  {
    icon: Clock,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    title: "Bonus especiales",
    pts: "Hasta +5 pts",
    desc: "Predicciones al inicio del torneo: Campeón (+5 pts), Subcampeón (+3 pts), Goleador (+3 pts), Mejor jugador (+3 pts), Mejor arquero (+3 pts).",
  },
  {
    icon: HelpCircle,
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-200",
    title: "Trivia Diaria",
    pts: "+0.5 pts",
    desc: "Responde la pregunta diaria de fútbol. Cada respuesta correcta te otorga +0.5 puntos en el ranking.",
  },
  {
    icon: Gift,
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
    title: "Distribución del premio",
    pts: "50 / 23 / 15%",
    desc: "El 88% del recaudo total se distribuye: 1° lugar (50%), 2° lugar (23%), 3° lugar (15%). El 12% restante cubre gastos administrativos.",
  },
];

export default function Reglas() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-7 animate-fade-up">
        <span className="label-eyebrow">Cómo funciona</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1 tracking-tight text-slate-900">
          Reglas de la Polla
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Todo lo que necesitas saber para competir y ganar.
        </p>
      </div>

      <div className="space-y-3">
        {REGLAS.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={i} className="card-surface p-5 animate-fade-up flex gap-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${r.bg}`}>
                <Icon className={`w-5 h-5 ${r.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-slate-900 text-sm">{r.title}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${r.bg} ${r.color} shrink-0`}>
                    {r.pts}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 card-surface p-5 bg-emerald-50 border-emerald-200">
        <div className="font-semibold text-emerald-800 mb-1 text-sm">💡 Recuerda</div>
        <ul className="text-sm text-emerald-700 space-y-1.5 leading-relaxed">
          <li>• La cuota de inscripción es de <strong>$50.000 COP</strong></li>
          <li>• <strong>Bloqueo por Pago:</strong> Quien no pague antes de que inicie el primer partido será bloqueado automáticamente, no podrá interactuar en la plataforma y sus pronósticos/resultados no serán válidos para el ranking.</li>
          <li>• Los bonus deben registrarse antes del inicio del torneo</li>
          <li>• El ranking se actualiza en tiempo real al ingresar cada resultado</li>
          <li>• En caso de empate en puntos, gana quien tenga más marcadores exactos</li>
        </ul>
      </div>
    </div>
  );
}
