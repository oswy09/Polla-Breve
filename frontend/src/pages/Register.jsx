import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import Footer from "../components/Footer";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await register(name, email, password);
    setBusy(false);
    if (res.ok) {
      toast.success("¡Cuenta creada! Bienvenido.");
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

          {/* Logo dentro del card, igual que Login */}
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

          <h1 className="font-display font-black text-2xl text-slate-900 mb-0.5">Crea tu cuenta</h1>
          <p className="text-sm text-slate-400 mb-6">Entra al ranking y compite con tus amigos.</p>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
            <div>
              <label className="label-eyebrow block mb-1.5">Nombre</label>
              <input
                type="text" required minLength={2} value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input" placeholder="Tu nombre"
                data-testid="register-name-input"
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-1.5">Correo</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input" placeholder="tu@correo.com"
                data-testid="register-email-input"
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-1.5">Contraseña</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input" placeholder="Mínimo 6 caracteres"
                data-testid="register-password-input"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="register-error">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full text-sm" data-testid="register-submit-button">
              {busy ? "Creando…" : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-5 text-sm text-slate-400 text-center">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold" data-testid="goto-login-link">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
