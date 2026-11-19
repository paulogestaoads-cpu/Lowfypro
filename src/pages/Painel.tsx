import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { chamarMotor, supabase } from "../lib/supabase";
import { NOME_PLANO, usePerfil } from "../lib/sessao";
import { CHAVE_QUIZ } from "../lib/quiz";

type FunilItem = { id: string; titulo: string | null; status: string; criado_em: string };

export default function Painel() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { perfil, recarregar } = usePerfil(true);
  const [funis, setFunis] = useState<FunilItem[]>([]);
  const [msg, setMsg] = useState("");
  const [criando, setCriando] = useState(false);
  const jaTentou = useRef(false);

  useEffect(() => {
    supabase.from("funis").select("id,titulo,status,criado_em").order("criado_em", { ascending: false })
      .then(({ data }) => setFunis((data as FunilItem[]) ?? []));
  }, []);

  const quizGuardado = () => {
    try { return JSON.parse(localStorage.getItem(CHAVE_QUIZ) || "null"); } catch { return null; }
  };

  const criarFunil = async () => {
    const respostas = quizGuardado();
    if (!respostas) { nav("/quiz"); return; }
    setCriando(true); setMsg("");
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: q, error } = await supabase.from("quiz_respostas")
        .insert({ usuario_id: u.user!.id, respostas }).select("id").single();
      if (error) throw new Error("Não foi possível salvar suas respostas.");
      const r = await chamarMotor({ acao: "criar", quiz_id: q.id });
      try { localStorage.removeItem(CHAVE_QUIZ); } catch { /* ok */ }
      nav(`/funil/${r.funil_id}?gerar=1`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setMsg(m === "sem_creditos" ? "sem_creditos" : m || "Algo deu errado.");
      recarregar();
    } finally { setCriando(false); }
  };

  // Veio do quiz: já cria o funil (uma vez)
  useEffect(() => {
    if (params.get("novo") === "1" && perfil && !jaTentou.current) {
      jaTentou.current = true;
      if (quizGuardado()) criarFunil();
    }
  }, [params, perfil]);

  const total = (perfil?.creditos_plano ?? 0) + (perfil?.creditos_avulsos ?? 0);

  return (
    <section className="wrap">
      <div className="grid g3" style={{ marginBottom: 24 }}>
        <div className="card"><p className="muted">Plano</p><p className="price">{NOME_PLANO[perfil?.plano ?? "gratis"]}</p></div>
        <div className="card"><p className="muted">Créditos</p><p className="price hl">{total}</p>
          <p className="muted" style={{ fontSize: ".82rem" }}>{perfil?.creditos_plano ?? 0} do plano · {perfil?.creditos_avulsos ?? 0} avulsos</p></div>
        <div className="card"><p className="muted">Um funil completo</p><p className="price">10 <span style={{ fontSize: "1rem" }}>créditos</span></p></div>
      </div>

      {msg === "sem_creditos" ? (
        <div className="alert" style={{ marginBottom: 20 }}>
          Seus créditos não são suficientes para um funil completo (10 créditos). Suas respostas ficaram salvas.{" "}
          <Link to="/planos" className="hl">Ver planos e recargas →</Link>
        </div>
      ) : msg ? <div className="alert" style={{ marginBottom: 20 }}>{msg}</div> : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <h2>Meus funis</h2>
        {quizGuardado()
          ? <button className="btn" onClick={criarFunil} disabled={criando}>{criando ? <span className="spin" /> : "Gerar funil com minhas respostas"}</button>
          : <Link to="/quiz" className="btn">+ Novo funil</Link>}
      </div>
      {funis.length === 0 ? (
        <div className="card muted">Você ainda não tem funis. Responda o quiz para criar o primeiro.</div>
      ) : (
        <div className="grid">
          {funis.map((f) => (
            <Link key={f.id} to={`/funil/${f.id}`} className="card" style={{ textDecoration: "none", display: "flex", justifyContent: "space-between" }}>
              <span>{f.titulo || "Funil sem título"}</span>
              <span className="muted">{f.status === "pronto" ? "✓ pronto" : f.status === "estornado" ? "expirado (créditos devolvidos)" : "em andamento"} · {new Date(f.criado_em).toLocaleDateString("pt-BR")}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
