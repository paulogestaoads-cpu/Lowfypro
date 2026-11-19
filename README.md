# Lowfy Pro

Gerador de funil low ticket com IA (oferta, criativos, campanha, copy, página HTML e mapa do funil), no método Sistema 360.

**Peças:** site (Vite + React, hospedado na Vercel) · banco e login (Supabase) · motor de IA (Edge Function `gerar-funil`, API do Claude) · pagamentos (Cakto → Edge Function `webhook-cakto`) · espelho no Google Sheets (`google-sheets/espelho.gs`).

## Segurança (regras do projeto)
- Chaves secretas (Anthropic, service role, segredo da Cakto) ficam **só** nos segredos do Supabase. Nunca no site, nunca no GitHub, nunca no chat.
- O navegador só lê os próprios dados (RLS). Créditos, planos e pagamentos só mudam por funções do servidor.
- Geração que falha não desconta crédito; funil abandonado por 24h devolve os créditos.

## Como colocar no ar
1. **Supabase** (projeto `lowfy-pro`, região São Paulo):
   - SQL Editor → cole e rode `supabase/migrations/20261119000000_lowfy_pro.sql`.
   - Database → Extensions → ligue `pg_cron` e rode as duas linhas `cron.schedule` do fim do arquivo.
   - Edge Functions → crie `gerar-funil` (com `index.ts` e `manual.md`) e `webhook-cakto`. Em `webhook-cakto`, desligue "Verify JWT".
   - Edge Functions → Secrets: `ANTHROPIC_API_KEY`, `CAKTO_WEBHOOK_SECRET`, `SHEETS_WEBHOOK_URL`.
   - Authentication → URL Configuration: Site URL = endereço do site; adicione `https://SEU-SITE/**` em Redirect URLs.
2. **Vercel**: importe este repositório e preencha as variáveis de `.env.example`
   (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ficam em Supabase → Project Settings → API; a chave anon é pública por natureza).
3. **Cakto**: crie as ofertas (Funil Pronto, Pro mensal, Max mensal, recargas), coloque os links nas variáveis `VITE_CHECKOUT_*`
   e os IDs das ofertas no mapa `OFERTAS` de `webhook-cakto/index.ts`. Webhook → URL da função `webhook-cakto`.
4. **Google Sheets**: siga o passo a passo no topo de `google-sheets/espelho.gs`.

## Rodar no computador
```
npm install
cp .env.example .env.local   # preencha
npm run dev
```
