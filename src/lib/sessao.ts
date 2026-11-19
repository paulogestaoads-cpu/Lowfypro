import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Perfil = { id: string; email: string; plano: string; creditos_plano: number; creditos_avulsos: number; plano_renova_em: string | null };

export function useSessao() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); setCarregando(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { sessao, carregando };
}

export function usePerfil(ativo: boolean) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const recarregar = async () => {
    const { data } = await supabase.from("perfis").select("*").maybeSingle();
    setPerfil(data as Perfil | null);
  };
  useEffect(() => { if (ativo) recarregar(); }, [ativo]);
  return { perfil, recarregar };
}

export const NOME_PLANO: Record<string, string> = { gratis: "Grátis", funil_pronto: "Funil Pronto", pro: "Pro", max: "Max" };
