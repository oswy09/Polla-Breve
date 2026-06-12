import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import Footer from "../components/Footer";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      toast.success("Sesión iniciada");
      navigate("/");
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-up">

        <div className="card-surface p-7">
          {/* Logo pequeño dentro del card, arriba del título */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="https://res.cloudinary.com/ddqbnr9vo/image/upload/v1780536995/logo_white_lxc6na.png"
              alt="Polla Breve"
              className="w-16 h-16 rounded-full object-contain p-0.5 shadow-sm border border-slate-200 bg-white mb-3"
            />
            <div className="text-center">
              <div className="font-display font-black text-xl tracking-tight text-slate-900 leading-none">Polla Breve</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-600 font-bold mt-1">Mundial 2026</div>
            </div>
          </div>

          <h1 className="font-display font-black text-2xl text-slate-900 mb-0.5">Bienvenido</h1>
          <p className="text-sm text-slate-400 mb-6">Inicia sesión para pronosticar.</p>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
            <div>
              <label className="label-eyebrow block mb-1.5">Correo</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input" placeholder="tu@correo.com"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10" placeholder="••••••••"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="login-error">
                {error}
              </div>
            )}

            <div className="text-right -mt-1">
              <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-emerald-600">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full text-sm" data-testid="login-submit-button">
              {busy ? "Entrando…" : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-5 text-sm text-slate-400 text-center">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold" data-testid="goto-register-link">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
