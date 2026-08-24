import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getInitials } from "../lib/api";
import { Trophy, ShieldCheck, LogOut, LayoutGrid, ListChecks, Users, MessageSquareMore, Star, BookOpen, ShoppingBag, ChevronDown, BarChart2, Bell, BellRing } from "lucide-react";
import { useLive } from "../lib/live";
import { useState, useRef, useEffect } from "react";
import { getPushPermissionState, subscribeToPush, isIos, isStandalone } from "../lib/push";
import { toast } from "sonner";
import IosInstallModal from "./IosInstallModal";

const LOGO = "https://res.cloudinary.com/ddqbnr9vo/image/upload/v1780536995/logo_white_lxc6na.png";

export default function Header() {
  const { user, logout } = useAuth();
  const { onlineCount } = useLive();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const [pushState, setPushState] = useState("default"); // "default" | "granted" | "denied" | "unsupported"
  const [showIosHint, setShowIosHint] = useState(false);
  const iosNeedsInstall = isIos() && !isStandalone();

  useEffect(() => {
    if (!user) return;
    if (iosNeedsInstall) {
      setPushState("default"); // mostramos la campana igual, para guiar a instalar
      return;
    }
    getPushPermissionState().then(setPushState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleEnablePush = async () => {
    if (iosNeedsInstall) {
      setShowIosHint(true);
      return;
    }
    if (pushState === "granted") return;
    try {
      await subscribeToPush(user.id);
      setPushState("granted");
      toast.success("¡Notificaciones activadas!");
    } catch (err) {
      setPushState(Notification.permission);
      toast.error(err.message || "No se pudieron activar las notificaciones");
    }
  };

  const isLocalAdminPreview =
    typeof window !== "undefined" &&
    window.location.hostname === "localhost" &&
    new URLSearchParams(window.location.search).get("localPreview") === "1";

  const withPreview = (path) => (isLocalAdminPreview ? `${path}?localPreview=1` : path);
  const effectiveUser = user || (isLocalAdminPreview ? { name: "Vista local", role: "admin" } : null);
  const isAdmin = effectiveUser && effectiveUser.role === "admin";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const linkBase = "px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap";
  const linkClass = ({ isActive }) =>
    `${linkBase} ${isActive ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`;

  const dropLinkClass = (isActive) =>
    `w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
      isActive ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  return (
    <>
    <header className="glass sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" data-testid="brand-link">
          <img
            src={LOGO}
            alt="Polla Breve"
            className="w-20 h-20 object-contain bg-white rounded-full p-1"
          />
        </Link>

        {/* Nav desktop — links principales + dropdown "Más" */}
        {effectiveUser && (
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            <NavLink to={withPreview("/")} end className={linkClass} data-testid="nav-matches">
              <LayoutGrid className="w-3.5 h-3.5" /> Partidos
            </NavLink>
            <NavLink to={withPreview("/resultados")} className={linkClass} data-testid="nav-results">
              <ListChecks className="w-3.5 h-3.5" /> Resultados
            </NavLink>
            <NavLink to={withPreview("/ranking")} className={linkClass} data-testid="nav-ranking">
              <Trophy className="w-3.5 h-3.5" /> Ranking
            </NavLink>
            <NavLink to={withPreview("/bonus")} className={linkClass} data-testid="nav-bonus">
              <Star className="w-3.5 h-3.5" /> Bonus
            </NavLink>

            {/* Dropdown "Más" */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`${linkBase} text-slate-500 hover:text-slate-900 hover:bg-slate-100`}
              >
                Más <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50">
                  <NavLink to={withPreview("/estadisticas")} className={({ isActive }) => dropLinkClass(isActive)} onClick={() => setMoreOpen(false)}>
                    <BarChart2 className="w-4 h-4" /> Estadísticas
                  </NavLink>
                  <NavLink to={withPreview("/reglas")} className={({ isActive }) => dropLinkClass(isActive)} onClick={() => setMoreOpen(false)}>
                    <BookOpen className="w-4 h-4" /> Reglas
                  </NavLink>
                  <NavLink to={withPreview("/chat")} className={({ isActive }) => dropLinkClass(isActive)} onClick={() => setMoreOpen(false)}>
                    <MessageSquareMore className="w-4 h-4" /> Chat
                  </NavLink>
                  <NavLink to={withPreview("/marketplace")} className={({ isActive }) => dropLinkClass(isActive)} onClick={() => setMoreOpen(false)}>
                    <ShoppingBag className="w-4 h-4" /> Marketplace
                  </NavLink>
                  {isAdmin && (
                    <NavLink to={withPreview("/admin")} className={({ isActive }) => dropLinkClass(isActive)} onClick={() => setMoreOpen(false)} data-testid="nav-admin">
                      <ShieldCheck className="w-4 h-4" /> Admin
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          </nav>
        )}

        {/* Derecha: online + avatar + salir */}
        <div className="flex items-center gap-2 shrink-0">
          {effectiveUser ? (
            <>
              {user && (iosNeedsInstall || (pushState !== "unsupported" && pushState !== "denied")) && (
                <button
                  onClick={handleEnablePush}
                  title={pushState === "granted" ? "Notificaciones activadas" : "Activar notificaciones"}
                  className={`p-2 rounded-lg border transition-colors ${
                    pushState === "granted"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300"
                  }`}
                >
                  {pushState === "granted" ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>
              )}
              <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                {user ? (
                  <>
                    <span className="hidden sm:inline">{onlineCount} en línea</span>
                    <span className="sm:hidden">{onlineCount}</span>
                  </>
                ) : (
                  "Preview"
                )}
              </div>
              <Link
                to={user ? `/perfil/${user.id}` : "#"}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                data-testid="user-info"
              >
                {effectiveUser.avatar_url ? (
                  <img
                    src={effectiveUser.avatar_url}
                    alt={effectiveUser.name}
                    className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200"
                    data-testid="user-avatar"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-display font-bold flex items-center justify-center text-sm shadow-sm" data-testid="user-avatar">
                    {getInitials(effectiveUser.name)}
                  </div>
                )}
                <div className="hidden lg:flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-800" data-testid="user-name">{effectiveUser.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400">
                    {isLocalAdminPreview && !user ? "Admin preview" : isAdmin ? "Admin" : "Jugador"}
                  </span>
                </div>
              </Link>
              {user && (
                <button onClick={handleLogout} className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3" data-testid="logout-button">
                  <LogOut className="w-3.5 h-3.5" /> Salir
                </button>
              )}
            </>
          ) : (
            <Link to={withPreview("/login")} className="btn-primary text-sm" data-testid="header-login-link">
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      {/* Nav mobile — scrollable */}
      {effectiveUser && (
        <nav className="lg:hidden border-t border-slate-200 px-2 py-1.5 flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          <NavLink to={withPreview("/")} end className={linkClass}><LayoutGrid className="w-4 h-4" /> Partidos</NavLink>
          <NavLink to={withPreview("/resultados")} className={linkClass}><ListChecks className="w-4 h-4" /> Resultados</NavLink>
          <NavLink to={withPreview("/ranking")} className={linkClass}><Trophy className="w-4 h-4" /> Ranking</NavLink>
          <NavLink to={withPreview("/bonus")} className={linkClass}><Star className="w-4 h-4" /> Bonus</NavLink>
          <NavLink to={withPreview("/estadisticas")} className={linkClass}><BarChart2 className="w-4 h-4" /> Estadísticas</NavLink>
          <NavLink to={withPreview("/chat")} className={linkClass}><MessageSquareMore className="w-4 h-4" /> Chat</NavLink>
          <NavLink to={withPreview("/reglas")} className={linkClass}><BookOpen className="w-4 h-4" /> Reglas</NavLink>
          <NavLink to={withPreview("/marketplace")} className={linkClass}><ShoppingBag className="w-4 h-4" /> Marketplace</NavLink>
          {isAdmin && (
            <NavLink to={withPreview("/admin")} className={linkClass}><ShieldCheck className="w-4 h-4" /> Admin</NavLink>
          )}
        </nav>
      )}
    </header>
    {showIosHint && <IosInstallModal onClose={() => setShowIosHint(false)} />}
    </>
  );
}
