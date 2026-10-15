# TIPE — Design system e redesign premium

Documento de referência do redesign (out/2026). Reúne a auditoria do projeto, os princípios extraídos da sunday, os tokens e componentes do design system e o registro do que mudou em cada etapa.

---

## 1. Auditoria do projeto

**Stack.** TanStack Start (React 19, SSR) + Vite 8, Tailwind CSS 4 (tokens em `src/styles.css`), componentes shadcn/Radix em `src/components/ui`, Supabase (auth, Postgres, realtime), Pagar.me (Pix e cartão para a gorjeta), React Query, Recharts (área do garçom). Projeto conectado ao Lovable.

**Marca (preservada, não alterar os tons-base).**

| Papel | Token | Valor |
|---|---|---|
| Primária, turquesa | `--brand-primary` / `--primary` | `oklch(0.77 0.14 178)` |
| Secundária, azul-marinho | `--brand-secondary` / `--secondary` | `oklch(0.2 0.04 250)` |
| Destaque, laranja (estrelas, alertas) | `--highlight` | `oklch(0.74 0.17 50)` |
| Turquesa claro (acento) | `--accent` | `oklch(0.9 0.09 165)` |

Fontes: **Sora** (títulos, `font-display`) e **Manrope** (texto, `font-sans`), via Google Fonts em `__root.tsx`. Logotipo em duas versões (`TipeLogo variant="light"` para fundo escuro e `"dark"` para fundo claro), símbolo `TipeSymbol`, mascote lebre em quatro poses (`src/assets/mascot-*.webp`) e o ícone de traço `HareOutline`.

**Inventário de telas.**

| Área | Rota | Arquivo principal |
|---|---|---|
| Landing | `/` | `routes/index.tsx` + `components/tipe/landing/*` |
| Simulador comercial | `/simulador` | `SimulatorExperience.tsx` (estado local, Mesa 12 fixa) |
| Conta do cliente | `/$restaurante/$mesa?t=` | `routes/$restaurante.$mesa.tsx` |
| Área do restaurante | `/$restaurante` | `RestaurantPanel.tsx`, `AdminSections.tsx` |
| Área do garçom | `/garcom` | `routes/_authenticated/garcom.tsx` |
| Backoffice TIPE (fundadores) | `/backoffice`, `/admin/leads` | `backoffice.tsx`, `admin.leads.tsx` |
| Cadastro e login | `/cadastro`, `/entrar`, `/reset-password` | rotas homônimas |
| Central Jurídica | `/legal/*` | `LegalPage.tsx`, conteúdo em `src/content/legal` |

**Recursos reais confirmados no código** (e por isso podem aparecer na comunicação): Pix via Pagar.me com aprovação automática; pagamento no estabelecimento (dinheiro ou maquininha) confirmado pelo caixa via `resolve_table_payment`; divisão por item, frações, partes iguais, valor e porcentagem; taxa de serviço configurável e removível por conta; gorjeta extra opcional após o pagamento (70% equipe / 30% TIPE); avaliação do atendimento; mapa do salão em tempo real; lançamento de pedidos (Lançamento TIPE); cozinha e bar (KDS); caixa com abertura, sangria, reforço e fechamento; relatórios de 1, 7 e 30 dias com exportação CSV; histórico com auditoria; QR Codes rotativos e Totem Studio; planos por número de mesas; área do garçom com saldo quinzenal e saque por Pix; assistente Lebre.

**Não ativo** (só pode aparecer como "em breve" ou "planejado"): Apple Pay e Google Pay (o servidor recusa esses métodos), conectores de PDV de terceiros, baixa automática no PDV, recibo por e-mail, conciliação financeira.

---

## 2. Análise da sunday

Páginas estudadas: home, digital-bill, staff-app, business-analytics, staff-performance, accounting, end-of-shift, tips-booster, branding, pricing e digital-tab.

**Limitação registrada:** o navegador automatizado deste ambiente não conseguiu abrir sundayapp.com (conexão recusada pela rede), então a análise se baseou no conteúdo textual e na estrutura das páginas, não em capturas de tela. Cores e espaçamentos exatos da sunday não foram observados. Nada da sunday foi reutilizado: nem imagens, nem textos, nem código.

**Princípios observados e como foram aplicados ao TIPE:**

1. **Uma frase por seção.** Títulos curtos e diretos, com uma ou duas linhas de apoio. → `SectionHeading`: eyebrow, título forte e no máximo duas linhas.
2. **O produto é a ilustração.** Celulares e painéis aparecem no lugar de fotos genéricas. → telas da jornada (`ProductScreens`) e prévias do painel e do garçom (`PanelPreviews`) montadas com os componentes reais e dados fictícios identificados.
3. **Jornada em passos numerados** (escanear, dividir, gorjeta, pagar, avaliar). → "Escaneie. Confira. Pague. Pronto." Na ordem real do TIPE, a gorjeta extra vem **depois** do pagamento.
4. **Público em camadas:** restaurante, cliente e equipe, cada um com sua seção. → seções Para restaurantes, Para clientes e Para garçons.
5. **Prova social densa.** → Não aplicado de propósito: o TIPE está em pré-lançamento e o bloco `SocialProof` só aparece quando houver dados reais.
6. **Painel do gerente centrado em "o que falta pagar"** e em ações rápidas (estorno, recibo). → Mesa com barra de progresso pago/total; ações da mesa agrupadas no detalhe.
7. **Relatórios por turno e por pessoa**, com cuidado ao ranquear (a sunday ranqueia desempenho). → Relatórios e equipe mostram valores por garçom sem ranking nem nota de desempenho.
8. **Preços claros em cards** com selo de recomendado e um bloco "incluso em todos os planos". → Cards por número de mesas com dados de `plans.ts`. Os preços ficam ocultos enquanto `SHOW_PLAN_PRICES` estiver desligado.
9. **Gorjeta em um toque.** A sunday usa sugestão por IA. → O TIPE mantém valores fixos, opção "Agora não" com o mesmo peso visual e nenhum valor pré-selecionado.

---

## 3. Tokens

Todos em `src/styles.css`. Os tons de marca são a base; os demais são derivados.

| Token semântico | Classe Tailwind | Uso |
|---|---|---|
| `--brand-primary` | `bg-brand`, `text-brand` | CTA de pagamento, progresso, foco de marca |
| `--brand-primary-strong` | `text-brand-strong` | Texto turquesa legível sobre fundo claro (contraste AA) |
| `--brand-primary-soft` | `bg-brand-soft` | Selecionado, chips de marca |
| `--brand-secondary` | `bg-ink`, `text-ink` | CTA institucional, superfícies escuras |
| `--background` / `--background-muted` | `bg-background`, `bg-background-muted` | Página, faixas alternadas |
| `--surface` / `--surface-elevated` | `bg-surface` | Cartões |
| `--border` | `border-border` | Divisórias e contornos |
| `--text-primary` / `--text-secondary` | `text-foreground`, `text-muted-foreground` | Texto |
| `--success` / `--warning` / `--error` | `bg-success`, `bg-warning`, `bg-destructive` | Estados |
| `--focus-ring` | `ring-focus-ring` | Foco visível em todos os controles |

Escala tipográfica fluida: `text-display` (hero), `text-headline` (seções), `text-title`. Utilitários: `container-page`, `eyebrow`, `money` (números tabulares) e `surface-card`. Sombras: `shadow-xs`, `shadow-soft`, `shadow-lift` e `shadow-device`.

> O `cn()` (`src/lib/utils.ts`) foi estendido para que o tailwind-merge reconheça esses tokens. Antes, `text-headline` era descartado quando vinha junto de uma cor de texto.

---

## 4. Componentes

`src/components/tipe/ds.tsx`: `Eyebrow`, `SectionHeading`, `StatusBadge` (vocabulário único de estado: success, warning, error, neutral, brand, info), `StatCard` (com estado vazio honesto), `EmptyState`, `PhoneFrame`, `PageHeader`, `Panel` e `brl()`.

`src/components/ui`: `Button` ganhou as variantes `ink` e `soft`, cantos arredondados e foco visível; `Badge` ganhou variantes de estado; `Card` ficou mais leve.

Regras:
- Cada estado tem uma cor e um texto. Não usamos cor sozinha.
- Valores financeiros sempre com `money` e `brl()`.
- Sem dado real: `StatCard empty` ou `EmptyState`, nunca número inventado.
- Ação sem backend: não vira botão. Recurso futuro aparece como `StatusBadge tone="neutral"` "Em breve".

---

## 5. Registro por etapa

Branch `redesign-premium`, um commit por etapa. Todas as mudanças são de apresentação: estado, efeitos, chamadas ao servidor, permissões e regras financeiras não foram alterados. As exceções intencionais estão marcadas com ⚑.

| Etapa | O que mudou |
|---|---|
| Design system + landing | Tokens, `ds.tsx`, `Button`/`Badge`/`Card`, landing completa (header, hero com jornada, seções por público, prévia do painel, integrações por status, preços por mesas, FAQ, rodapé). Correção no `cn()`, que antes descartava os tamanhos customizados. |
| Conta do cliente (`/$restaurante/$mesa`) | Topo leve com progresso Conta → Pagamento → Pronto; itens em cartões; ação principal fixa no rodapé; formas de pagamento como opções de rádio; Pix com retorno de "copiado"; confirmação "Pagamento realizado!" com recibo montado só com dados do servidor; gorjeta sem valor pré-selecionado e com a divisão 70/30 visível; esqueleto de carregamento; tema escuro dos novos tokens. ⚑ Apple Pay e Google Pay aparecem como "Em breve" e não podem ser escolhidos, porque o servidor recusa esses métodos. ⚑ Na gorjeta, cartão só aparece quando há chave pública para tokenizar. |
| Painel do restaurante (`/$restaurante`) | Barra superior clara; navegação agrupada (Operação, Financeiro, Equipe, Configurações); navegação móvel com quatro atalhos e "Mais"; cabeçalho por seção; salão com estados consistentes e progresso pago/total; caixa, histórico, KDS, relatórios e início com `StatCard`, seletor segmentado, estados vazios e esqueletos. |
| Área do garçom (`/garcom`) | Saldo em destaque, abas segmentadas, gráfico nas cores da marca, passos de saque numerados e status com `StatusBadge`. `/painel` usa a mesma moldura. |
| Simulador (`/simulador`) | Mesmo visual da conta real. ⚑ As carteiras aparecem como "Em breve", como na conta real. |
| Base | `Input`, `Textarea` e `Dialog` alinhados ao design system; `TipeLogo` mescla classes com `cn()`; preconnect para `fonts.gstatic.com`. |

### Como foi verificado

- O ambiente de desenvolvimento não tinha acesso ao registro npm, então `vite build`, `tsc` completo, ESLint e Vitest **não puderam ser executados**. Rode `bun run build` e `bun run lint` antes do merge.
- Checagem de tipos parcial: `tsc` com as mesmas opções estritas do projeto, com pacotes externos tipados como `any`. Ela detecta nomes inexistentes, propriedades erradas e `exactOptionalPropertyTypes` no código local. Todos os arquivos alterados passaram.
- Renderização real com React 19 e Tailwind 4 de cada tela alterada, com dados fictícios, em 1440 px e 390 px, em tema claro e escuro (conta do cliente), percorrendo a jornada completa com Playwright: identificação, conta, divisão, pagamento, presencial, Pix, confirmação, avaliação, gorjeta e pagamento da gorjeta.

### Pendências e próximos passos

1. **Performance não medida.** As metas (Lighthouse 90+, LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1) precisam ser medidas no deploy de preview. Pontos de atenção: o logotipo PNG tem cerca de 116 KB (vale uma versão SVG ou WebP) e há duas famílias de fonte com sete pesos.
2. Telas não tocadas nesta rodada: backoffice dos fundadores, `/admin/leads`, cadastro e login, Central Jurídica, cardápio, integrações, configurações, recebimentos e assinatura. Elas já herdam os componentes base, mas a composição continua a antiga.
3. Prova social: o bloco existe na landing, mas está oculto até haver restaurantes e depoimentos reais.
4. Recibo por e-mail, conciliação e Apple Pay/Google Pay continuam como "planejado" ou "em breve" em toda a comunicação.
