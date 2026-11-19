// Lowfy Pro — recebe avisos de pagamento da Cakto e libera plano/créditos
//
// Segredos: CAKTO_WEBHOOK_SECRET, SHEETS_WEBHOOK_URL (opcional)
// ATENÇÃO: os nomes dos campos do aviso (evento, e-mail, id da oferta) devem ser
// conferidos com um evento de teste real da Cakto antes de ir ao ar. Estão isolados em lerAviso().

import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// O que cada oferta da Cakto libera. Troque as chaves pelos IDs reais das ofertas.
const OFERTAS: Record<string, { plano?: "funil_pronto" | "pro" | "max"; creditos: number; avulso: boolean }> = {
  OFERTA_FUNIL_PRONTO: { plano: "funil_pronto", creditos: 10, avulso: true },
  OFERTA_BUMP_2_FUNIS: { creditos: 20, avulso: true },
  OFERTA_PRO_MENSAL:   { plano: "pro", creditos: 50, avulso: false },
  OFERTA_PRO_ANUAL:    { plano: "pro", creditos: 50, avulso: false },
  OFERTA_MAX_MENSAL:   { plano: "max", creditos: 150, avulso: false },
  OFERTA_RECARGA_P:    { creditos: 15, avulso: true },
  OFERTA_RECARGA_G:    { creditos: 50, avulso: true },
};
const SOBRA_MAXIMA: Record<string, number> = { pro: 50, max: 150 }; // sobra que passa para o mês seguinte

function lerAviso(b: any) {
  return {
    segredo: b?.secret ?? "",
    evento: String(b?.event ?? ""),
    vendaId: String(b?.data?.id ?? b?.data?.refId ?? ""),
    email: String(b?.data?.customer?.email ?? "").toLowerCase().trim(),
    ofertaId: String(b?.data?.offer?.id ?? b?.data?.product?.id ?? ""),
    produto: String(b?.data?.product?.name ?? ""),
    valor: Number(b?.data?.amount ?? b?.data?.baseAmount ?? 0),
  };
}

// Compara o segredo sem vazar tempo de comparação
function iguais(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function espelharNoSheets(aba: string, linha: Record<string, unknown>) {
  const url = Deno.env.get("SHEETS_WEBHOOK_URL");
  if (!url) return;
  fetch(url, { method: "POST", body: JSON.stringify({ aba, linha }) }).catch(() => {});
}

// Encontra a pessoa pelo e-mail; se ainda não tem conta, cria (ela entra depois com o link mágico)
async function usuarioPorEmail(email: string): Promise<string | null> {
  const { data: perfil } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
  if (perfil) return perfil.id;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) return null;
  return data.user.id; // o gatilho do banco cria o perfil
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  let body: unknown;
  try { body = await req.json(); } catch { return new Response("corpo inválido", { status: 400 }); }

  const a = lerAviso(body);
  if (!iguais(a.segredo, Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "")) {
    return new Response("não autorizado", { status: 401 });
  }
  if (!a.vendaId || !a.email) return new Response("aviso incompleto", { status: 400 });

  const idEvento = `${a.vendaId}:${a.evento}`;
  // Idempotência: o mesmo aviso chegando 2 vezes não libera crédito 2 vezes
  const { error: dup } = await admin.from("vendas").insert({
    id: idEvento, email: a.email, produto: a.produto || a.ofertaId, valor: a.valor, status: a.evento, bruto: body,
  });
  if (dup) return new Response("já processado");

  const usuarioId = await usuarioPorEmail(a.email);
  if (!usuarioId) return new Response("erro ao criar usuário", { status: 500 });
  await admin.from("vendas").update({ usuario_id: usuarioId }).eq("id", idEvento);

  const oferta = OFERTAS[a.ofertaId];
  const aprovado = ["purchase_approved", "subscription_renewed"].includes(a.evento);
  // Assinatura cancelada não corta na hora: o plano vale até plano_renova_em e expira sozinho
  // (função expirar_planos no banco). Reembolso e chargeback cortam na hora.
  const cancelado = ["refund", "chargeback"].includes(a.evento);

  if (aprovado && oferta) {
    if (oferta.plano && !oferta.avulso) {
      // Renovação mensal: corta a sobra no limite e soma os créditos do mês
      const { data: p } = await admin.from("perfis").select("creditos_plano").eq("id", usuarioId).single();
      const sobra = Math.min(p?.creditos_plano ?? 0, SOBRA_MAXIMA[oferta.plano] ?? 0);
      await admin.from("perfis").update({
        plano: oferta.plano,
        creditos_plano: sobra,
        plano_renova_em: new Date(Date.now() + 31 * 86400_000).toISOString(),
      }).eq("id", usuarioId);
    } else if (oferta.plano) {
      await admin.from("perfis").update({ plano: oferta.plano }).eq("id", usuarioId).eq("plano", "gratis");
    }
    await admin.rpc("adicionar_creditos", {
      p_usuario: usuarioId, p_qtd: oferta.creditos, p_avulso: oferta.avulso,
      p_motivo: a.evento === "subscription_renewed" ? "renovacao" : "compra", p_ref: a.vendaId,
    });
  }

  if (cancelado) {
    // Reembolso/chargeback: volta para grátis na hora (os créditos avulsos de outras compras continuam dela)
    await admin.from("perfis").update({ plano: "gratis", creditos_plano: 0 }).eq("id", usuarioId)
      .in("plano", ["pro", "max"]);
  }

  espelharNoSheets("Pro – Vendas", {
    data: new Date().toISOString(), email: a.email, produto: a.produto || a.ofertaId,
    valor: a.valor, evento: a.evento,
  });

  return new Response("ok");
});
