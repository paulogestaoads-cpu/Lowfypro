import { Link, NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSessao } from "../lib/sessao";

export default function Layout() {
  const { sessao } = useSessao();
  return (
    <>
      <div className="wrap">
        <header className="top">
          <Link to="/" className="logo"><b>L</b> Lowfy <span className="hl">Pro</span></Link>
          <nav className="links">
            {sessao ? (
              <>
                <NavLink to="/painel">Painel</NavLink>
                <NavLink to="/radar">Radar</NavLink>
                <NavLink to="/planos">Planos</NavLink>
                <a href="#" onClick={(e) => { e.preventDefault(); supabase.auth.signOut().then(() => (location.href = "/")); }}>Sair</a>
              </>
            ) : (
              <>
                <NavLink to="/planos">Planos</NavLink>
                <NavLink to="/entrar">Entrar</NavLink>
              </>
            )}
          </nav>
        </header>
      </div>
      <main><Outlet /></main>
      <footer className="wrap">
        Lowfy Pro · um produto Invencível Ads · Resultados dependem da execução de cada pessoa; não prometemos ganhos.
      </footer>
    </>
  );
}
