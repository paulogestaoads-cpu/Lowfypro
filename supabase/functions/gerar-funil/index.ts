// Lowfy Pro — motor de geração do funil (Supabase Edge Function, Deno)
//
// Duas ações:
//   { acao: "criar", quiz_id }            → reserva 10 créditos e cria o funil com 6 etapas pendentes
//   { acao: "etapa", funil_id, etapa }    → gera UMA etapa (1 a 6) chamando a API do Claude
//
// Segredos (Supabase → Edge Functions → Secrets), nunca no código:
//   ANTHROPIC_API_KEY, SHEETS_WEBHOOK_URL (opcional)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por padrão nas Edge Functions.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

// Chave de servidor: projetos novos do Supabase usam SUPABASE_SECRET_KEYS; os antigos, SUPABASE_SERVICE_ROLE_KEY
function chaveServidor(): string {
  const antiga = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try {
    const novas = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return novas.default ?? Object.values(novas)[0] as string;
  } catch { return ""; }
}

const MODELO = "claude-opus-5-5";
const CREDITOS_FUNIL = 10;
const LIMITE_ETAPAS_POR_HORA = 30; // anti-abuso
// Preço por 1 milhão de tokens (US$), para registrar o custo real de cada chamada
const PRECO = { entrada: 4, saida: 20, cacheLeitura: 0.2, cacheEscrita: 5 };

const MANUAL = await Deno.readTextFile(new URL("./manual.md", import.meta.url));

const NOMES_ETAPAS: Record<number, string> = {
  1: "Etapa 1 — Inteligência e Oferta",
  2: "Etapa 2 — Criativos para testar",
  3: "Etapa 3 — Ciclo de campanha (24 horas)",
  4: "Etapa 4 — Copy das páginas",
  5: "Etapa 5 — HTML da página de vendas",
  6: "Etapa 6 — Mapa do funil e próximos passos",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, chaveServidor());

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Espelha um evento no Google Sheets (não trava a resposta se falhar)
function espelharNoSheets(aba: string, linha: Record<string, unknown>) {
  const url = Deno.env.get("SHEETS_WEBHOOK_URL");
  if (!url) return;
  fetch(url, { method: "POST", body: JSON.stringify({ aba, linha }) }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  // 1) Quem está pedindo? (o token de login vem do navegador e é conferido pelo Supabase)
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: auth } = await admin.auth.getUser(token ?? "");
  const usuario = auth?.user;
  if (!usuario) return json({ erro: "faça login" }, 401);

  let body: { acao?: string; quiz_id?: string; funil_id?: string; etapa?: number };
  try { body = await req.json(); } catch { return json({ erro: "corpo inválido" }, 400); }

  // ---------- CRIAR FUNIL ----------
  if (body.acao === "criar") {
    const { data: quiz } = await admin.from("quiz_respostas")
      .select("id").eq("id", body.quiz_id ?? "").eq("usuario_id", usuario.id).maybeSingle();
    if (!quiz) return json({ erro: "quiz não encontrado" }, 404);

    const funilId = crypto.randomUUID();
    const { data: ok, error } = await admin.rpc("reservar_creditos", {
      p_usuario: usuario.id, p_qtd: CREDITOS_FUNIL, p_motivo: "reserva_funil", p_ref: funilId,
    });
    if (error) return json({ erro: "falha ao reservar créditos" }, 500);
    if (!ok) return json({ erro: "sem_creditos" }, 402);

    await admin.from("funis").insert({
      id: funilId, usuario_id: usuario.id, quiz_id: quiz.id, creditos_reservados: CREDITOS_FUNIL,
    });
    await admin.from("funil_etapas").insert(
      [1, 2, 3, 4, 5, 6].map((etapa) => ({ funil_id: funilId, etapa })),
    );
    return json({ funil_id: funilId });
  }

  // ---------- GERAR UMA ETAPA ----------
  if (body.acao === "etapa") {
    const etapa = Number(body.etapa);
    if (!(etapa >= 1 && etapa <= 6)) return json({ erro: "etapa inválida" }, 400);

    const { data: funil } = await admin.from("funis")
      .select("id, usuario_id, status, quiz_id").eq("id", body.funil_id ?? "").maybeSingle();
    if (!funil || funil.usuario_id !== usuario.id) return json({ erro: "funil não encontrado" }, 404);
    if (funil.status === "estornado") return json({ erro: "funil expirado" }, 410);

    // Anti-abuso: máximo de etapas por hora por pessoa
    const umaHora = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from("uso_ia").select("id", { count: "exact", head: true })
      .eq("usuario_id", usuario.id).gte("criado_em", umaHora);
    if ((count ?? 0) >= LIMITE_ETAPAS_POR_HORA) return json({ erro: "muitas gerações, aguarde" }, 429);

    // Etapas anteriores precisam estar prontas (cada uma usa o que veio antes)
    const { data: etapas } = await admin.from("funil_etapas")
      .select("etapa, conteudo, status").eq("funil_id", funil.id).order("etapa");
    const anteriores = (etapas ?? []).filter((e) => e.etapa < etapa);
    if (anteriores.some((e) => e.status !== "pronta")) return json({ erro: "gere as etapas anteriores primeiro" }, 409);

    const { data: quiz } = await admin.from("quiz_respostas")
      .select("respostas").eq("id", funil.quiz_id).single();

    await admin.from("funil_etapas").update({ status: "gerando", atualizado_em: new Date().toISOString() })
      .eq("funil_id", funil.id).eq("etapa", etapa);

    // Monta o pedido: manual (fixo, em cache) + quiz + etapas anteriores + qual etapa gerar agora
    const contexto = [
      "RESPOSTAS DO QUIZ:",
      JSON.stringify(quiz?.respostas ?? {}, null, 2),
      ...anteriores.map((e) => `\n\n=== ${NOMES_ETAPAS[e.etapa]} (já gerada) ===\n${e.conteudo}`),
      `\n\nAgora gere somente a ${NOMES_ETAPAS[etapa]}, seguindo o manual.` +
        (etapa === 5 ? " Responda apenas com o documento HTML completo, começando em <!doctype html>." : ""),
    ].join("\n");

    try {
      const stream = anthropic.beta.messages.stream({
        model: MODELO,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default", // se o modelo recusar por política, outro modelo continua
        output_config: { effort: "medium" },
        system: [{ type: "text", text: MANUAL, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: contexto }],
      });
      const resposta = await stream.finalMessage();

      if (resposta.stop_reason === "refusal") throw new Error("recusado");
      if (resposta.stop_reason === "max_tokens") throw new Error("resposta cortada");

      const texto = resposta.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("")
        .trim();

      const u = resposta.usage;
      const custo =
        ((u.input_tokens ?? 0) * PRECO.entrada +
          (u.output_tokens ?? 0) * PRECO.saida +
          (u.cache_read_input_tokens ?? 0) * PRECO.cacheLeitura +
          (u.cache_creation_input_tokens ?? 0) * PRECO.cacheEscrita) / 1_000_000;

      await admin.from("funil_etapas").update({
        conteudo: texto, status: "pronta", atualizado_em: new Date().toISOString(),
      }).eq("funil_id", funil.id).eq("etapa", etapa);

      await admin.from("uso_ia").insert({
        usuario_id: usuario.id, funil_id: funil.id, etapa, modelo: resposta.model,
        tokens_entrada: u.input_tokens, tokens_saida: u.output_tokens,
        tokens_cache_leitura: u.cache_read_input_tokens, custo_usd: custo,
      });

      // Etapa 6 pronta = funil pronto e créditos confirmados
      const terminou = etapa === 6;
      await admin.from("funis").update({
        status: terminou ? "pronto" : "gerando",
        ...(terminou ? { creditos_reservados: 0 } : {}),
        // Título do funil = primeiro título da etapa 1 (nome da oferta)
        ...(etapa === 1 ? { titulo: (texto.match(/^#{1,3}\s+(.+)$/m)?.[1] ?? "").replace(/[*_`]/g, "").slice(0, 120) || null } : {}),
        atualizado_em: new Date().toISOString(),
      }).eq("id", funil.id);

      espelharNoSheets("Pro – Gerações", {
        data: new Date().toISOString(), email: usuario.email, funil: funil.id, etapa,
        modelo: resposta.model, tokens_entrada: u.input_tokens, tokens_saida: u.output_tokens,
        custo_usd: custo.toFixed(4),
      });

      return json({ etapa, conteudo: texto, pronto: terminou });
    } catch (e) {
      // Não desconta nada: a etapa volta para "erro" e pode ser refeita sem custo
      await admin.from("funil_etapas").update({ status: "erro", atualizado_em: new Date().toISOString() })
        .eq("funil_id", funil.id).eq("etapa", etapa);
      console.error("falha na etapa", etapa, e instanceof Error ? e.message : e);
      return json({ erro: "falha ao gerar, tente de novo" }, 502);
    }
  }

  return json({ erro: "ação desconhecida" }, 400);
});
