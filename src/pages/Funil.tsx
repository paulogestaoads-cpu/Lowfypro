import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { chamarMotor, supabase } from "../lib/supabase";

type Etapa = { etapa: number; conteudo: string | null; status: string };
const NOMES = ["", "Oferta", "Criativos", "Campanha", "Copy", "Página (HTML)", "Mapa do funil"];

function limparHtml(t: string) {
  const m = t.match(/<!doctype html[\s\S]*<\/html>/i);
  return m ? m[0] : t.replace(/^```html\s*|```\s*$/g, "");
}

export default function Funil() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [aba, setAba] = useState(1);
  const [gerando, setGerando] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const rodando = useRef(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from("funil_etapas").select("etapa,conteudo,status").eq("funil_id", id).order("etapa");
    const lista = (data as Etapa[]) ?? [];
    setEtapas(lista);
    return lista;
  }, [id]);

  // Gera as etapas que faltam, uma por vez (cada uma usa a anterior)
  const gerarFaltantes = useCallback(async () => {
    if (rodando.current) return;
    rodando.current = true; setErro("");
    try {
      let lista = await carregar();
      for (const e of lista) {
        if (e.status === "pronta") continue;
        setGerando(e.etapa); setAba(e.etapa);
        await chamarMotor({ acao: "etapa", funil_id: id, etapa: e.etapa });
        lista = await carregar();
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar.");
      await carregar();
    } finally { setGerando(null); rodando.current = false; }
  }, [carregar, id]);

  useEffect(() => {
    carregar().then((l) => {
      if (params.get("gerar") === "1" && l.some((e) => e.status !== "pronta")) gerarFaltantes();
    });
  }, [carregar, gerarFaltantes, params]);

  const atual = etapas.find((e) => e.etapa === aba);
  const prontas = etapas.filter((e) => e.status === "pronta").length;
  const html = aba === 5 && atual?.conteudo ? limparHtml(atual.conteudo) : "";

  const baixar = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a"); a.href = url; a.download = "pagina-de-vendas.html"; a.click();
    URL.revokeObjectURL(url);
  };
  const copiar = () => navigator.clipboard?.writeText(atual?.conteudo ?? "");

  return (
    <section className="wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <h2>Seu funil <span className="hl">{prontas}/6</span></h2>
        {prontas < 6 && gerando === null && (
          <button className="btn sm" onClick={gerarFaltantes}>{prontas === 0 ? "Gerar funil" : "Continuar geração"}</button>
        )}
      </div>
      <div className="bar" style={{ marginBottom: 14 }}><i style={{ width: `${(prontas / 6) * 100}%` }} /></div>
      {gerando !== null && (
        <div className="ok-box" style={{ marginBottom: 14 }}>
          <span className="spin" /> Gerando etapa {gerando}: {NOMES[gerando]}. Leva de 30 segundos a 2 minutos. Pode deixar a página aberta.
        </div>
      )}
      {erro && <div className="alert" style={{ marginBottom: 14 }}>{erro}. Nenhum crédito extra foi cobrado; clique em "Continuar geração".</div>}

      <div className="steps" style={{ marginBottom: 16 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const e = etapas.find((x) => x.etapa === n);
          return (
            <button key={n} onClick={() => setAba(n)}
              className={`step ${aba === n ? "cur" : e?.status === "pronta" ? "ok" : ""}`}>
              {e?.status === "pronta" ? "✓" : gerando === n ? "…" : n} {NOMES[n]}
            </button>
          );
        })}
      </div>

      <div className="card">
        {!atual?.conteudo ? (
          <p className="muted">Esta etapa ainda não foi gerada.</p>
        ) : aba === 5 ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button className="btn sm" onClick={baixar}>Baixar HTML</button>
              <button className="btn sm ghost" onClick={copiar}>Copiar código</button>
            </div>
            <p className="muted" style={{ fontSize: ".85rem", marginBottom: 10 }}>
              Troque os links "#checkout" pelo link do seu checkout antes de publicar.
            </p>
            {/* sandbox sem scripts: a página gerada não consegue rodar código dentro do Lowfy */}
            <iframe className="preview" sandbox="" srcDoc={html} title="Prévia da página" />
          </>
        ) : (
          <>
            <div style={{ textAlign: "right" }}><button className="btn sm ghost" onClick={copiar}>Copiar</button></div>
            <div className="md"><ReactMarkdown>{atual.conteudo}</ReactMarkdown></div>
          </>
        )}
      </div>
    </section>
  );
}
