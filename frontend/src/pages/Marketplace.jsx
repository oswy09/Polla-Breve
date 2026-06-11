import { ShoppingBag, ExternalLink, Tag } from "lucide-react";

const ALIADOS = [
  {
    id: 1,
    categoria: "Indumentaria",
    nombre: "Camiseta Selección Colombia",
    descripcion: "Camiseta oficial de la Selección Colombia para el Mundial 2026. Disponible en todas las tallas.",
    precio: "Consultar precio",
    badge: "Nuevo",
    badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
    emoji: "🇨🇴",
    cta: "Ver producto",
    disponible: false,
  },
  {
    id: 2,
    categoria: "Bar Aliado",
    nombre: "Bar Aliado Mundial 2026",
    descripcion: "Vive los partidos del Mundial en el mejor ambiente. Promociones exclusivas para participantes de la Polla Breve.",
    precio: "Promociones especiales",
    badge: "Aliado",
    badgeColor: "bg-blue-50 border-blue-200 text-blue-700",
    emoji: "🍺",
    cta: "Ver más",
    disponible: false,
  },
];

export default function Marketplace() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-7 animate-fade-up">
        <span className="label-eyebrow">Aliados</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1 tracking-tight text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-emerald-600" />
          Marketplace
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Productos y servicios exclusivos para participantes de la Polla Breve.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ALIADOS.map((aliado) => (
          <div key={aliado.id} className="card-surface overflow-hidden animate-fade-up flex flex-col">
            {/* Header con emoji */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-10 text-6xl border-b border-slate-200">
              {aliado.emoji}
            </div>

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="label-eyebrow text-slate-400">{aliado.categoria}</span>
                  <h3 className="font-display font-black text-slate-900 text-base mt-0.5">
                    {aliado.nombre}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${aliado.badgeColor}`}>
                  {aliado.badge}
                </span>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-4">
                {aliado.descripcion}
              </p>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{aliado.precio}</span>
                </div>
                <button
                  disabled={!aliado.disponible}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                >
                  Próximamente <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 card-surface p-5 border-dashed text-center">
        <p className="text-sm text-slate-400">
          ¿Quieres ser aliado de Polla Breve? Escríbenos a{" "}
          <a href="mailto:mundial@pollabreve.online" className="text-emerald-600 font-semibold">
            mundial@pollabreve.online
          </a>
        </p>
      </div>
    </div>
  );
}
