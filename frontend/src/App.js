import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LiveProvider } from "@/lib/live";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Protected from "@/components/Protected";
import BonusRequiredModal from "@/components/BonusRequiredModal";
import MotivationModal from "@/components/MotivationModal";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Ranking from "@/pages/Ranking";
import Resultados from "@/pages/Resultados";
import Admin from "@/pages/Admin";
import Chat from "@/pages/Chat";
import Bonus from "@/pages/Bonus";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Reglas from "@/pages/Reglas";
import Marketplace from "@/pages/Marketplace";
import UserProfile from "@/pages/UserProfile";
import Estadisticas from "@/pages/Estadisticas";

function Shell({ children }) {
  return (
    <div className="App min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <LiveProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            theme="light"
            richColors
            toastOptions={{ className: "font-body" }}
          />
          <BonusRequiredModal />
          <MotivationModal />
          <Routes>
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/reglas"
              element={<Protected allowLocalPreview><Shell><Reglas /></Shell></Protected>}
            />
            <Route path="/marketplace"
              element={<Protected allowLocalPreview><Shell><Marketplace /></Shell></Protected>}
            />
            <Route path="/"
              element={<Protected allowLocalPreview><Shell><Dashboard /></Shell></Protected>}
            />
            <Route path="/resultados"
              element={<Protected allowLocalPreview><Shell><Resultados /></Shell></Protected>}
            />
            <Route path="/ranking"
              element={<Protected allowLocalPreview><Shell><Ranking /></Shell></Protected>}
            />
            <Route path="/bonus"
              element={<Protected allowLocalPreview><Shell><Bonus /></Shell></Protected>}
            />
            <Route path="/chat"
              element={<Protected allowLocalPreview><Shell><Chat /></Shell></Protected>}
            />
            <Route path="/admin"
              element={<Protected adminOnly allowLocalPreview><Shell><Admin /></Shell></Protected>}
            />
            <Route path="/perfil/:userId"
              element={<Protected allowLocalPreview><Shell><UserProfile /></Shell></Protected>}
            />
            <Route path="/estadisticas"
              element={<Protected allowLocalPreview><Shell><Estadisticas /></Shell></Protected>}
            />
          </Routes>
        </BrowserRouter>
      </LiveProvider>
    </AuthProvider>
  );
}

export default App;
