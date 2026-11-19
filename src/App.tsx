import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Protegida from "./components/Protegida";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Entrar from "./pages/Entrar";
import Painel from "./pages/Painel";
import Funil from "./pages/Funil";
import Radar from "./pages/Radar";
import Planos from "./pages/Planos";
import { configurado } from "./lib/supabase";

export default function App() {
  return (
    <>
      {!configurado && (
        <div className="alert" style={{ borderRadius: 0, textAlign: "center" }}>
          Modo demonstração: faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o README).
        </div>
      )}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/painel" element={<Protegida><Painel /></Protegida>} />
          <Route path="/funil/:id" element={<Protegida><Funil /></Protegida>} />
          <Route path="/radar" element={<Protegida><Radar /></Protegida>} />
          <Route path="*" element={<div className="narrow" style={{ padding: 60 }}><h2>Página não encontrada</h2></div>} />
        </Route>
      </Routes>
    </>
  );
}
