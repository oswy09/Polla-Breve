import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import Footer from "../components/Footer";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase redirige con tokens en el hash — esperamos a que la sesión esté lista
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      toast.error("Mínimo 6 caracteres");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("No se pudo actualizar. El link puede haber expirado.");
    } else {
      toast.success("Contraseña actualizada. Inicia sesión.");
      navigate("/login");
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

          <h1 className="font-display font-black text-2xl text-slate-900 mb-0.5">Nueva contraseña</h1>
          <p className="text-sm text-slate-400 mb-6">Elige una contraseña segura de mínimo 6 caracteres.</p>

          {!ready ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              Verificando link…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label-eyebrow block mb-1.5">Nueva contraseña</label>
                <input
                  type="password" required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input" placeholder="Mínimo 6 caracteres"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="label-eyebrow block mb-1.5">Confirmar contraseña</label>
                <input
                  type="password" required minLength={6} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="form-input" placeholder="Repite la contraseña"
                  disabled={busy}
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full text-sm">
                {busy ? "Guardando…" : "Guardar nueva contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
