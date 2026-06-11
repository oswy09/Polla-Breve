import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Footer from "../components/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo enviar el correo. Intenta de nuevo.");
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-up">
        <div className="card-surface p-7">

          <div className="flex flex-col items-center mb-6">
            <img
              src="https://res.cloudinary.com/ddqbnr9vo/image/upload/v1780536995/logo_white_lxc6na.png"
              alt="Polla Breve"
              className="w-12 h-12 rounded-full object-contain p-0.5 shadow-sm border border-slate-200 bg-white mb-3 mx-auto"
            />
            <div className="text-center">
              <div className="font-display font-black text-xl tracking-tight text-slate-900 leading-none">Polla Breve</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-600 font-bold mt-1">Mundial 2026</div>
            </div>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h1 className="font-display font-black text-xl text-slate-900 mb-2">Revisa tu correo</h1>
              <p className="text-sm text-slate-500 mb-6">
                Te enviamos un link a <span className="font-semibold text-slate-700">{email}</span> para restablecer tu contraseña.
              </p>
              <Link to="/login" className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold">
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display font-black text-2xl text-slate-900 mb-0.5">¿Olvidaste tu contraseña?</h1>
              <p className="text-sm text-slate-400 mb-6">
                Ingresa tu email y te enviamos un link para crear una nueva.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="label-eyebrow block mb-1.5">Correo</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input" placeholder="tu@correo.com"
                    disabled={busy}
                  />
                </div>
                <button type="submit" disabled={busy} className="btn-primary w-full text-sm">
                  {busy ? "Enviando…" : "Enviar link de recuperación"}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
