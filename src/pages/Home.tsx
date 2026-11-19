import { Link } from "react-router-dom";

const ITENS = [
  ["01", "Oferta validável", "Público, microresultado, mecanismo e preço pensados para vender em 24 horas."],
  ["02", "Criativos e campanha", "5 ângulos de criativo (dor, desejo, mecanismo, prova, contraste) e o ciclo de teste com R$30."],
  ["03", "Página pronta", "Copy completa e o HTML da página de vendas, pronto para publicar e ligar ao checkout."],
];

export default function Home() {
  return (
    <>
      <section className="wrap" style={{ textAlign: "center", paddingTop: 50 }}>
        <span className="tag">● Gerador de funil low ticket com IA</span>
        <h1 style={{ margin: "22px auto 16px", maxWidth: 860 }}>
          Da ideia ao <span className="hl">funil pronto</span> em minutos
        </h1>
        <p className="muted" style={{ maxWidth: 620, margin: "0 auto 28px", fontSize: "1.1rem" }}>
          Responda as mesmas 10 perguntas do Lowfy e receba oferta, criativos, campanha, copy e a página de vendas,
          tudo no método Sistema 360.
        </p>
        <Link to="/quiz" className="btn">CRIAR MEU FUNIL →</Link>
        <p className="muted" style={{ fontSize: ".85rem", marginTop: 12 }}>O quiz é grátis. O funil completo usa créditos.</p>
      </section>
      <section className="wrap">
        <div className="grid g3">
          {ITENS.map(([n, t, d]) => (
            <div className="card" key={n}>
              <span className="hl" style={{ fontFamily: "Space Grotesk", fontWeight: 700 }}>{n}</span>
              <h3 style={{ margin: "8px 0 6px" }}>{t}</h3>
              <p className="muted" style={{ fontSize: ".95rem" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="narrow" style={{ textAlign: "center" }}>
        <h2>Radar de anúncios <span className="hl">validados</span></h2>
        <p className="muted" style={{ margin: "10px 0 20px" }}>
          Toda semana, os anúncios de infoprodutos que estão rodando há mais de 30 dias na Meta, com a análise do porquê funcionam.
        </p>
        <Link to="/planos" className="btn ghost">Ver planos</Link>
      </section>
    </>
  );
}
