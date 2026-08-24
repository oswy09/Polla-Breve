import { useState, useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { X, Flame } from "lucide-react";

const LOTTIE_SRC = "https://lottie.host/c60ee076-acab-4b38-b30a-8e900f005181/AISLvJkT8m.lottie";

// Clave de fecha YYYY-MM-DD en hora Colombia (UTC-5)
function colombiaDateKey() {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fillTemplate(template, vars) {
  return template
    .replace(/\{gap\}/g, vars.gap)
    .replace(/\{user_points\}/g, vars.userPoints)
    .replace(/\{leader_points\}/g, vars.leaderPoints);
}

export default function MotivationModal() {
  const { user } = useAuth();
  const [data, setData] = useState(null); // { gap, userPoints, leaderPoints, message }
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const todayKey = colombiaDateKey();
    const shownKey = `motivation_shown_${todayKey}_${user.id}`;
    const forcedKey = `motivation_forced_shown_${user.id}`;

    Promise.all([
      api.get("/motivation-settings"),
      api.get("/ranking"),
    ])
      .then(([{ data: settings }, { data: rows }]) => {
        if (!settings?.message) return;
        if (!rows || rows.length < 2) return;

        const leaderPoints = rows[0].points;
        const me = rows.find((r) => r.user_id === user.id);
        if (!me) return;

        // ¿El admin forzó el modal para este usuario?
        const targets = settings.force_targets || [];
        const isForced = targets.includes("all") || targets.includes(user.id);

        if (isForced) {
          // Modal forzado: ignorar el localStorage del día normal
          // Pero evitar mostrarlo dos veces en la misma sesión de navegador
          if (localStorage.getItem(forcedKey) === "1") return;
        } else {
          // Lógica normal: solo si está habilitado y dentro del umbral
          if (localStorage.getItem(shownKey) === "1") return;
          if (!settings.enabled) return;
          if (me.user_id === rows[0].user_id) return; // ya es el líder
          const gap = leaderPoints - me.points;
          const threshold = Number(settings.threshold) || 10;
          if (gap <= 0 || gap > threshold) return;
        }

        const gap = Math.max(0, leaderPoints - me.points);
        setData({
          gap,
          userPoints: me.points,
          leaderPoints,
          title: settings.title || "¡Está cerca!",
          message: fillTemplate(settings.message, {
            gap,
            userPoints: me.points,
            leaderPoints,
          }),
        });
        setOpen(true);

        if (isForced) {
          // Marca como visto en esta sesión y limpia del servidor
          localStorage.setItem(forcedKey, "1");
          api.post("/motivation-settings/clear-force", { user_id: user.id })
            .then(() => localStorage.removeItem(forcedKey)) // limpia para la próxima vez que se fuerce
            .catch(() => {});
        } else {
          localStorage.setItem(shownKey, "1");
        }
      })
      .catch(() => {});
  }, [user]);

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-fade-up overflow-hidden">
        <div className="relative">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-full h-44 bg-gradient-to-b from-amber-50 to-white">
            <DotLottieReact src={LOTTIE_SRC} loop autoplay />
          </div>
        </div>
        <div className="px-6 pb-6 pt-1 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-500 mb-2">
            <Flame className="w-3.5 h-3.5" /> {data.title}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{data.message}</p>
          <button
            onClick={() => setOpen(false)}
            className="btn-primary w-full mt-5 text-sm"
          >
            ¡Voy con todo!
          </button>
        </div>
      </div>
    </div>
  );
}
