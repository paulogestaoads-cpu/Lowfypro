-- Lowfy Pro: banco de dados, créditos e regras de segurança (RLS)
-- Regra de ouro: a página (anon/authenticated) só LÊ o que é da própria pessoa.
-- Tudo que mexe em crédito, plano ou pagamento roda em funções do servidor (service_role).

-- ============ PERFIS ============
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plano text not null default 'gratis' check (plano in ('gratis','funil_pronto','pro','max')),
  plano_renova_em timestamptz,
  creditos_plano int not null default 0 check (creditos_plano >= 0),   -- renovam todo mês (sobra até o limite)
  creditos_avulsos int not null default 0 check (creditos_avulsos >= 0), -- recargas, não expiram
  criado_em timestamptz not null default now()
);

-- Cria o perfil automaticamente quando a pessoa faz login pela primeira vez
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.criar_perfil();

-- ============ RESPOSTAS DO QUIZ ============
create table if not exists public.quiz_respostas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete cascade,
  respostas jsonb not null,           -- as 10 respostas, sem nome/WhatsApp
  criado_em timestamptz not null default now()
);

-- ============ FUNIS ============
create table if not exists public.funis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid references public.quiz_respostas(id),
  titulo text,
  status text not null default 'gerando' check (status in ('gerando','pronto','erro','estornado')),
  creditos_reservados int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.funil_etapas (
  funil_id uuid not null references public.funis(id) on delete cascade,
  etapa int not null check (etapa between 1 and 6),
  conteudo text,
  status text not null default 'pendente' check (status in ('pendente','gerando','pronta','erro')),
  tentativas int not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (funil_id, etapa)
);

-- ============ USO DE IA (custo real por chamada) ============
create table if not exists public.uso_ia (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users(id) on delete set null,
  funil_id uuid references public.funis(id) on delete set null,
  etapa int,
  modelo text,
  tokens_entrada int,
  tokens_saida int,
  tokens_cache_leitura int,
  custo_usd numeric(10,5),
  criado_em timestamptz not null default now()
);

-- ============ MOVIMENTOS DE CRÉDITO (extrato) ============
create table if not exists public.creditos_movimentos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  quantidade int not null,            -- positivo = entrou, negativo = saiu
  motivo text not null,               -- 'compra','renovacao','reserva_funil','estorno','refazer_etapa'
  referencia text,                    -- id da venda ou do funil
  criado_em timestamptz not null default now()
);

-- ============ VENDAS (vindas do webhook da Cakto) ============
create table if not exists public.vendas (
  id text primary key,                -- id da transação na Cakto (evita processar 2 vezes)
  usuario_id uuid references auth.users(id) on delete set null,
  email text not null,
  produto text not null,
  valor numeric(10,2),
  status text not null,
  bruto jsonb,
  criado_em timestamptz not null default now()
);

-- ============ RADAR (biblioteca semanal) ============
create table if not exists public.radar_itens (
  id bigint generated always as identity primary key,
  semana date not null,
  fonte text not null check (fonte in ('meta','tiktok','hotmart','outra')),
  nicho text not null,
  anunciante text,
  link_oficial text not null,
  ativo_desde date,
  dias_ativo int,
  angulo text,                        -- dor/desejo/mecanismo/prova/contraste
  gancho text,
  analise text,                       -- por que funciona, no método do Pablito
  plano_minimo text not null default 'pro' check (plano_minimo in ('gratis','pro','max')),
  criado_em timestamptz not null default now()
);

-- ============ SEGURANÇA: RLS ============
alter table public.perfis              enable row level security;
alter table public.quiz_respostas      enable row level security;
alter table public.funis               enable row level security;
alter table public.funil_etapas        enable row level security;
alter table public.uso_ia              enable row level security;
alter table public.creditos_movimentos enable row level security;
alter table public.vendas              enable row level security;
alter table public.radar_itens         enable row level security;

-- Cada pessoa só lê o que é dela. Nenhuma política de INSERT/UPDATE/DELETE para o navegador:
-- só as funções do servidor (service_role) escrevem nessas tabelas.
create policy "ler meu perfil"     on public.perfis              for select using (auth.uid() = id);
create policy "ler meu quiz"       on public.quiz_respostas      for select using (auth.uid() = usuario_id);
-- Única escrita liberada para o navegador: salvar as próprias respostas do quiz
create policy "salvar meu quiz"    on public.quiz_respostas      for insert with check (auth.uid() = usuario_id);
create policy "ler meus funis"     on public.funis               for select using (auth.uid() = usuario_id);
create policy "ler minhas etapas"  on public.funil_etapas        for select using (
  exists (select 1 from public.funis f where f.id = funil_id and f.usuario_id = auth.uid()));
create policy "ler meu extrato"    on public.creditos_movimentos for select using (auth.uid() = usuario_id);
-- uso_ia e vendas: só o servidor lê (sem política = ninguém do navegador acessa)

-- Radar: grátis vê os itens 'gratis'; Pro vê 'gratis' e 'pro'; Max vê tudo
create policy "ler radar do meu plano" on public.radar_itens for select using (
  plano_minimo = 'gratis'
  or (plano_minimo = 'pro' and exists (select 1 from public.perfis p where p.id = auth.uid() and p.plano in ('pro','max')))
  or (plano_minimo = 'max' and exists (select 1 from public.perfis p where p.id = auth.uid() and p.plano = 'max'))
);

-- ============ FUNÇÕES DE CRÉDITO (atômicas, só o servidor chama) ============

-- Reserva créditos ao criar um funil. Usa primeiro os do plano, depois os avulsos.
-- "for update" trava a linha: dois cliques ao mesmo tempo não gastam o mesmo crédito duas vezes.
create or replace function public.reservar_creditos(p_usuario uuid, p_qtd int, p_motivo text, p_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_plano int; v_avulso int; v_do_plano int;
begin
  select creditos_plano, creditos_avulsos into v_plano, v_avulso
    from perfis where id = p_usuario for update;
  if v_plano is null or v_plano + v_avulso < p_qtd then
    return false;
  end if;
  v_do_plano := least(v_plano, p_qtd);
  update perfis set creditos_plano = creditos_plano - v_do_plano,
                    creditos_avulsos = creditos_avulsos - (p_qtd - v_do_plano)
   where id = p_usuario;
  insert into creditos_movimentos (usuario_id, quantidade, motivo, referencia)
    values (p_usuario, -p_qtd, p_motivo, p_ref);
  return true;
end $$;

-- Devolve créditos (funil que falhou ou foi abandonado). Devolve como avulso para não se perder na renovação.
create or replace function public.estornar_creditos(p_usuario uuid, p_qtd int, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update perfis set creditos_avulsos = creditos_avulsos + p_qtd where id = p_usuario;
  insert into creditos_movimentos (usuario_id, quantidade, motivo, referencia)
    values (p_usuario, p_qtd, 'estorno', p_ref);
end $$;

-- Adiciona créditos (compra ou renovação de plano)
create or replace function public.adicionar_creditos(p_usuario uuid, p_qtd int, p_avulso boolean, p_motivo text, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_avulso then
    update perfis set creditos_avulsos = creditos_avulsos + p_qtd where id = p_usuario;
  else
    update perfis set creditos_plano = creditos_plano + p_qtd where id = p_usuario;
  end if;
  insert into creditos_movimentos (usuario_id, quantidade, motivo, referencia)
    values (p_usuario, p_qtd, p_motivo, p_ref);
end $$;

-- Ninguém do navegador pode chamar as funções de crédito
revoke execute on function public.reservar_creditos(uuid,int,text,text) from public, anon, authenticated;
revoke execute on function public.estornar_creditos(uuid,int,text)      from public, anon, authenticated;
revoke execute on function public.adicionar_creditos(uuid,int,boolean,text,text) from public, anon, authenticated;

-- Funis abandonados há mais de 24h devolvem os créditos (rodar 1x por hora com pg_cron)
create or replace function public.estornar_funis_abandonados()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id, usuario_id, creditos_reservados from funis
           where status in ('gerando','erro') and atualizado_em < now() - interval '24 hours'
             and creditos_reservados > 0
           for update skip locked loop
    perform estornar_creditos(r.usuario_id, r.creditos_reservados, r.id::text);
    update funis set status = 'estornado', creditos_reservados = 0, atualizado_em = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.estornar_funis_abandonados() from public, anon, authenticated;

create index if not exists funis_usuario_idx on public.funis(usuario_id, criado_em desc);
create index if not exists uso_ia_usuario_idx on public.uso_ia(usuario_id, criado_em desc);
create index if not exists radar_semana_idx on public.radar_itens(semana desc, nicho);

-- Planos mensais que não renovaram (assinatura cancelada) voltam para grátis 3 dias após o vencimento.
-- Rodar 1x por dia com pg_cron, junto com estornar_funis_abandonados (1x por hora).
create or replace function public.expirar_planos()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update perfis set plano = 'gratis', creditos_plano = 0
   where plano in ('pro','max') and plano_renova_em < now() - interval '3 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.expirar_planos() from public, anon, authenticated;

-- Agendamentos (requer a extensão pg_cron ligada no Supabase: Database → Extensions)
-- select cron.schedule('estornar-funis', '0 * * * *', 'select public.estornar_funis_abandonados()');
-- select cron.schedule('expirar-planos', '30 3 * * *', 'select public.expirar_planos()');
