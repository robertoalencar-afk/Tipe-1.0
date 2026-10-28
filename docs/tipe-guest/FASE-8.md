# Fase 8 — Landing do Tipe Guest + página Restaurante Fundador (relatório)

Branch `guest/landing` (base `correcao-visual-v6`). PR em rascunho: [#53](https://github.com/robertoalencar-afk/Tipe-1.0/pull/53).
Detalhes da implementação: [LANDING.md](./LANDING.md).

## O que foi feito

- `/produtos/guest` reescrita com a narrativa "Sua próxima experiência começa aqui." (descoberta, reservas, relacionamento), separando **Disponível hoje** / **Planejado no Guest** / **Demonstração**. Status **Em breve** mantido.
- Formulário "Quero ser avisado" com consentimento LGPD, gravando lead de verdade em `restaurant_leads` (`origin_page = tipe-guest`).
- `/restaurante-fundador` (Fase 3, item Landing): "Faça parte dos primeiros restaurantes a construir o futuro da Tipe.", ligada à adoção da Tipe de hoje, regras "em definição", cadastro com `origin_page = restaurante-fundador`.
- Menu, cards da home e rodapé atualizados pelo catálogo (`produtos.ts`); card do Guest mostra tela real de avaliação; link "Restaurante Fundador" no rodapé; sitemap.

Arquivos principais: `src/components/tipe/site/guest/PaginaGuest.tsx`, `src/components/tipe/site/FormularioInteresse.tsx`, `src/routes/restaurante-fundador.tsx`, `src/lib/tipe/interest-lead.ts` (+ teste), `src/lib/tipe/leads.functions.ts` (`submitInterestLead`, aditivo), `src/components/tipe/site/produtos.ts`, `ProdutoPagina.tsx`, `CardProduto.tsx`, `LandingChrome.tsx`, `produtos.$produto.tsx`, `sitemap[.]xml.ts`, `routeTree.gen.ts` (gerado), `tests/e2e/landing-guest.e2e.cjs` + `tests/e2e/fake-postgrest.mjs`.

## Migrações

**Nenhuma.** Nada aplicado em Supabase (real ou outro). Lockfile não alterado.

## Testes rodados (saída resumida, 28/10/2026)

- `npx tsc --noEmit` → saída vazia, código 0.
- `npx vitest run` → `Test Files 11 passed (11)`, `Tests 111 passed (111)` (inclui 5 novos em `interest-lead.test.ts`: origem gravada, consentimento obrigatório, Fundador exige restaurante e WhatsApp, campo-isca, origem desconhecida recusada).
- `bun run build` → código 0 (`✓ built in ...` cliente, SSR e nitro).
- Playwright (chromium pré-instalado), `vite dev` na porta 5182, Supabase substituído por um PostgREST **falso local** (`tests/e2e/fake-postgrest.mjs`, 127.0.0.1:5199), sem chave de e-mail: **151 verificações OK, 10 falhas, todas na home e em componentes que esta branch não altera** (ver abaixo).
  - `/produtos/guest` e `/restaurante-fundador` em 375 (com `prefers-reduced-motion: reduce`), 390, 768, 1280 e 1440 px: H1 único, sem rolagem horizontal, sem erro de console, sem link de loja, sem "Tipe 2.0", todo campo com label visível, todos os alvos ≥ 44 px; Guest com "Em breve", os três selos, link para `/restaurante-fundador` (nenhum para `/fundador`), Apple Pay e Google Pay citados, title/description próprios; Fundador sem escassez artificial.
  - Home nas 5 larguras: "Em breve" mantido, H1 único, sem rolagem horizontal, sem erro de console.
  - Formulários (390 px), para as duas origens: consentimento começa desmarcado; sem consentimento mostra erro e não envia; servidor falhando (500) mostra erro e **não** mostra sucesso; servidor ok mostra sucesso; exatamente 1 linha gravada, com `origin_page` correto, `privacy_accepted_at` preenchido e `marketing_opt_in = false`.
  - Falhas encontradas (pré-existentes, fora do escopo): na home, os botões das abas da demonstração ("Cliente", "Família", "Garçom", "Gerente", "Caixa", "Salão") têm 40 px de altura e há 20 controles da calculadora sem label associado. Esses componentes (`AbasDemo`, calculadora) não foram tocados.

Capturas (`docs/tipe-guest/capturas/fase-8/`, webp): `guest-{375,390,768,1280,1440}`, `fundador-{375,390,768,1280,1440}`, `home-{390,1440}`, `form-tipe-guest-{erro,sucesso}-390`, `form-restaurante-fundador-{erro,sucesso}-390`. As capturas de página inteira passam o tema escuro das seções só quando a seção cruza o meio da tela; por isso algumas seções escuras aparecem claras na captura.

## Situação

**Implementado e testado**: página do Guest, selos hoje/planejado/demonstração, formulário do Guest e do Fundador (contra banco falso local), `/restaurante-fundador`, card, menu, rodapé, SEO, responsividade nas 5 larguras, movimento reduzido em 375 px.

**Implementado sem validação**: gravação no Supabase real (não testada de propósito); e-mail interno do Fundador (sem chave de e-mail no ambiente, a chamada falha em silêncio como no fluxo atual); preview da Lovable/Cloudflare da branch; leitores de tela reais.

**Pendente**: carrossel de telas do Guest (só quando a demonstração da Fase 6 existir); coluna própria de tipo de lead (hoje o aviso do Guest grava rótulo fixo em `restaurant_name`); filtro por origem em `/admin/leads`/CRM; e-mail de aviso "o Guest chegou"; revisão jurídica dos textos de consentimento; alvos de 40 px e campos sem label da home (pré-existentes).

**Fora do escopo**: reservas reais, app, lojas, estado de lançamento configurável (`order/landing`, migração 0028), regras comerciais do Fundador, selo do Fundador.

## Decisões para o Roberto

1. **Merge** deste PR em `correcao-visual-v6` (e a ordem com o `order/landing` #33; conflitos esperados pequenos, descritos em LANDING.md).
2. **Textos**: título "Sua próxima experiência começa aqui.", finalidades de consentimento (revisão jurídica), texto "Na próxima fase da Tipe".
3. **Leads de cliente final** em `restaurant_leads`: aceitar como está até haver coluna/tabela própria (exige migração, com seu ok).
4. **Quando mudar o status** do Guest de "Em breve": só por decisão sua; hoje é `status: "em-breve"` em `produtos.ts` (ou, depois do #33, pelo estado de lançamento configurável).
5. **Regras do Restaurante Fundador** (vagas, período, vantagens): seguem "em definição" na página até aprovação comercial.
