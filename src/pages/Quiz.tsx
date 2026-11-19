import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHAVE_QUIZ, PERGUNTAS } from "../lib/quiz";

export default function Quiz() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_QUIZ) || "{}"); } catch { return {}; }
  });
  const p = PERGUNTAS[i];
  const valor = resp[p.id] ?? "";
  const salvar = (v: string) => {
    const novo = { ...resp, [p.id]: v.slice(0, 600) };
    setResp(novo);
    try { localStorage.setItem(CHAVE_QUIZ, JSON.stringify(novo)); } catch { /* sem armazenamento */ }
  };
  const ultima = i === PERGUNTAS.length - 1;
  const ok = valor.trim().length >= (p.tipo === "texto" ? 3 : 1);

  return (
    <section className="narrow">
      <div className="bar" style={{ marginBottom: 10 }}><i style={{ width: `${((i + 1) / PERGUNTAS.length) * 100}%` }} /></div>
      <p className="muted" style={{ fontSize: ".85rem", marginBottom: 18 }}>Pergunta {i + 1} de {PERGUNTAS.length}</p>
      <h2 style={{ marginBottom: 20 }}>{p.titulo}</h2>
      {p.tipo === "opcoes" ? (
        p.opcoes.map((o) => (
          <button key={o} className={`opt ${valor === o ? "on" : ""}`} onClick={() => salvar(o)}>{o}</button>
        ))
      ) : (
        <textarea value={valor} placeholder={p.dica} onChange={(e) => salvar(e.target.value)} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Voltar</button>
        <button className="btn" disabled={!ok}
          onClick={() => (ultima ? nav("/painel?novo=1") : setI(i + 1))}>
          {ultima ? "GERAR MEU FUNIL →" : "Continuar →"}
        </button>
      </div>
    </section>
  );
}
