import { CHECKOUT, linkCheckout } from "../lib/supabase";
import { useSessao } from "../lib/sessao";

const PLANOS = [
  { nome: "Funil Pronto", preco: "R$ 47", obs: "pagamento único", link: CHECKOUT.funil_pronto,
    itens: ["1 funil completo (10 créditos)", "Oferta, criativos, campanha, copy e página", "Acesso para sempre ao que gerar"] },
  { nome: "Pro", preco: "R$ 97", obs: "por mês", destaque: true, link: CHECKOUT.pro,
    itens: ["50 créditos por mês (5 funis)", "Sobra de até 50 créditos passa para o mês seguinte", "Radar semanal completo", "Refazer qualquer etapa por 2 créditos"] },
  { nome: "Max", preco: "R$ 197", obs: "por mês", link: CHECKOUT.max,
    itens: ["150 créditos por mês (15 funis)", "Tudo do Pro", "Radar com análises aprofundadas", "Ideal para quem atende clientes"] },
];

export default function Planos() {
  const { sessao } = useSessao();
  const email = sessao?.user.email;
  return (
    <section className="wrap">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2>Escolha seu <span className="hl">plano</span></h2>
        <p className="muted">Comece pelo quiz grátis. Pague só quando quiser o funil completo.</p>
      </div>
      <div className="grid g3">
        {PLANOS.map((p) => (
          <div key={p.nome} className="card" style={p.destaque ? { borderColor: "var(--primary)", background: "var(--card-2)" } : {}}>
            {p.destaque && <span className="tag">Mais escolhido</span>}
            <h3 style={{ marginTop: 10 }}>{p.nome}</h3>
            <p className="price">{p.preco}</p><p className="muted" style={{ fontSize: ".85rem" }}>{p.obs}</p>
            <ul className="feat">{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
            <Botao link={linkCheckout(p.link, email)} texto={`Quero o ${p.nome}`} />
          </div>
        ))}
      </div>
      <h3 style={{ margin: "36px 0 12px" }}>Acabaram os créditos? Recarregue</h3>
      <div className="grid g2">
        <div className="card"><h3>Recarga P · <span className="hl">R$ 27</span></h3><p className="muted">15 créditos que não expiram</p>
          <div style={{ marginTop: 12 }}><Botao link={linkCheckout(CHECKOUT.recarga_p, email)} texto="Comprar recarga P" ghost /></div></div>
        <div className="card"><h3>Recarga G · <span className="hl">R$ 67</span></h3><p className="muted">50 créditos que não expiram</p>
          <div style={{ marginTop: 12 }}><Botao link={linkCheckout(CHECKOUT.recarga_g, email)} texto="Comprar recarga G" ghost /></div></div>
      </div>
      <p className="muted" style={{ fontSize: ".82rem", marginTop: 20 }}>
        Compre com o mesmo e-mail que você usa para entrar. Se uma geração falhar, os créditos não são descontados.
        Cancelamento a qualquer momento: o plano vale até o fim do período pago.
      </p>
    </section>
  );
}

function Botao({ link, texto, ghost }: { link?: string; texto: string; ghost?: boolean }) {
  if (!link) return <button className={`btn ${ghost ? "ghost" : ""}`} disabled>Em breve</button>;
  return <a className={`btn ${ghost ? "ghost" : ""}`} href={link}>{texto}</a>;
}
