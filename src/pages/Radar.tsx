import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { usePerfil } from "../lib/sessao";

type Item = { id: number; semana: string; fonte: string; nicho: string; anunciante: string | null; link_oficial: string;
  dias_ativo: number | null; angulo: string | null; gancho: string | null; analise: string | null };

export default function Radar() {
  const { perfil } = usePerfil(true);
  const [itens, setItens] = useState<Item[]>([]);
  const [nicho, setNicho] = useState("");
  useEffect(() => {
    supabase.from("radar_itens").select("*").order("semana", { ascending: false }).order("dias_ativo", { ascending: false }).limit(200)
      .then(({ data }) => setItens((data as Item[]) ?? []));
  }, []);
  const nichos = [...new Set(itens.map((i) => i.nicho))].sort();
  const lista = nicho ? itens.filter((i) => i.nicho === nicho) : itens;
  const bloqueado = perfil && !["pro", "max"].includes(perfil.plano);

  return (
    <section className="wrap">
      <span className="tag">Atualizado toda semana</span>
      <h2 style={{ margin: "12px 0 6px" }}>Radar de anúncios <span className="hl">validados</span></h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Anúncios de infoprodutos ativos há 30 dias ou mais (sinal de que estão vendendo). Cada um leva para a Biblioteca de Anúncios oficial.
      </p>
      {bloqueado && (
        <div className="ok-box" style={{ marginBottom: 18 }}>
          Você está vendo só a amostra grátis. <Link to="/planos" className="hl">No Pro você vê o Radar completo →</Link>
        </div>
      )}
      {nichos.length > 1 && (
        <div className="steps" style={{ marginBottom: 16 }}>
          <button className={`step ${!nicho ? "cur" : ""}`} onClick={() => setNicho("")}>Todos</button>
          {nichos.map((n) => <button key={n} className={`step ${nicho === n ? "cur" : ""}`} onClick={() => setNicho(n)}>{n}</button>)}
        </div>
      )}
      {lista.length === 0 ? <div className="card muted">O primeiro Radar da semana ainda está sendo preparado.</div> : (
        <div className="grid g2">
          {lista.map((i) => (
            <div className="card" key={i.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <span className="tag">{i.nicho}</span>
                {i.dias_ativo != null && <span className="hl" style={{ fontWeight: 700 }}>{i.dias_ativo} dias no ar</span>}
              </div>
              <h3>{i.anunciante}</h3>
              {i.gancho && <p style={{ margin: "8px 0" }}>“{i.gancho}”</p>}
              {i.angulo && <p className="muted" style={{ fontSize: ".88rem" }}>Ângulo: {i.angulo}</p>}
              {i.analise && <p className="muted" style={{ fontSize: ".92rem", margin: "8px 0" }}>{i.analise}</p>}
              <a className="btn sm ghost" href={i.link_oficial} target="_blank" rel="noopener noreferrer">Ver na Biblioteca de Anúncios ↗</a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
