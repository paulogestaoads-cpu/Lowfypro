import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSessao } from "../lib/sessao";

export default function Entrar() {
  const [params] = useSearchParams();
  const volta = params.get("volta") || "/painel";
  const destino = volta.startsWith("/") && !volta.startsWith("//") ? volta : "/painel"; // evita redirecionar para outro site
  const { sessao } = useSessao();
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado" | "erro">("");

  if (sessao) return <Navigate to={destino} replace />;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("enviando");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${location.origin}${destino}` },
    });
    setEstado(error ? "erro" : "enviado");
  };

  return (
    <section className="narrow" style={{ maxWidth: 460 }}>
      <h2 style={{ marginBottom: 8 }}>Entrar no <span className="hl">Lowfy Pro</span></h2>
      <p className="muted" style={{ marginBottom: 20 }}>Sem senha: enviamos um link de acesso para o seu e-mail. Use o mesmo e-mail da compra.</p>
      {estado === "enviado" ? (
        <div className="ok-box">Pronto! Abra seu e-mail e clique no link para entrar. Pode fechar esta aba.</div>
      ) : (
        <form onSubmit={enviar} className="grid">
          <input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn" disabled={estado === "enviando"}>
            {estado === "enviando" ? <span className="spin" /> : "Receber link de acesso"}
          </button>
          {estado === "erro" && <div className="alert">Não conseguimos enviar agora. Espere 1 minuto e tente de novo.</div>}
        </form>
      )}
    </section>
  );
}
