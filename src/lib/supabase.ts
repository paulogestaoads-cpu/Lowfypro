import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const configurado = Boolean(url && anon);
// A chave "anon" é pública por natureza; quem protege os dados são as regras RLS do banco.
export const supabase = createClient(url || "http://localhost", anon || "anon", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function chamarMotor(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("gerar-funil", { body });
  if (error) {
    let msg = "Algo deu errado. Tente de novo.";
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.erro === "sem_creditos") msg = "sem_creditos";
      else if (j?.erro) msg = j.erro;
    } catch { /* mantém a mensagem padrão */ }
    throw new Error(msg);
  }
  return data;
}

export const CHECKOUT = {
  funil_pronto: import.meta.env.VITE_CHECKOUT_FUNIL_PRONTO as string | undefined,
  pro: import.meta.env.VITE_CHECKOUT_PRO as string | undefined,
  max: import.meta.env.VITE_CHECKOUT_MAX as string | undefined,
  recarga_p: import.meta.env.VITE_CHECKOUT_RECARGA_P as string | undefined,
  recarga_g: import.meta.env.VITE_CHECKOUT_RECARGA_G as string | undefined,
};

// Guarda as UTMs da primeira visita para atribuir a venda ao anúncio certo
export function guardarUtms() {
  const p = new URLSearchParams(location.search);
  const utms: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach((k) => {
    const v = p.get(k);
    if (v) utms[k] = v.slice(0, 200);
  });
  try {
    if (Object.keys(utms).length && !localStorage.getItem("lowfy_utms")) {
      localStorage.setItem("lowfy_utms", JSON.stringify(utms));
    }
  } catch { /* navegador sem armazenamento */ }
}
export function lerUtms(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem("lowfy_utms") || "{}"); } catch { return {}; }
}
// Leva as UTMs para o checkout da Cakto
export function linkCheckout(base?: string, email?: string) {
  if (!base) return undefined;
  const u = new URL(base);
  Object.entries(lerUtms()).forEach(([k, v]) => u.searchParams.set(k, v));
  if (email) u.searchParams.set("email", email);
  return u.toString();
}
