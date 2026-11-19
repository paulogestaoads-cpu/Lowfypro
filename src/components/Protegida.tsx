import { Navigate, useLocation } from "react-router-dom";
import { useSessao } from "../lib/sessao";

export default function Protegida({ children }: { children: JSX.Element }) {
  const { sessao, carregando } = useSessao();
  const loc = useLocation();
  if (carregando) return <div className="narrow" style={{ padding: 40 }}><span className="spin" /></div>;
  if (!sessao) return <Navigate to={`/entrar?volta=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}
