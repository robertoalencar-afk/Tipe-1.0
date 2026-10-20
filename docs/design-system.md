# TIPE: design system (redesign v3, out/2026)

Referência visual: sunday (sundayapp.com), estudada só de forma passiva, por capturas e navegação nas páginas públicas (home, digital-bill, staff-app e pricing) com o REA. Nenhum arquivo, código, imagem ou texto da sunday foi reutilizado. A identidade continua sendo da TIPE: turquesa e azul-marinho, logotipo oficial, lebres oficiais e a proposta comercial do produto.

---

## 1. O que a sunday faz, e o que adaptamos

| Observado na sunday | Como ficou na TIPE |
|---|---|
| Fundo branco puro, texto quase preto e cinzas neutros; a cor de marca aparece pouco e em pontos de destaque | Tokens neutros (`--background` branco, `--foreground` `oklch(0.15 0.005 250)`). O turquesa ficou para o que é ação de pagamento, progresso e brilhos de marca |
| Uma só família grotesca, títulos enormes em peso ~500 (não negrito) e entreletra negativa | Inter Tight variável (100–900), sem Sora, Bricolage nem Manrope. Títulos em `font-medium`, `tracking` de −0,025 a −0,035 em e `text-wrap: balance` |
| Botões em pílula: o principal preto e o secundário com contorno fino | `Button` com `rounded-full`. `default` em preto (`bg-foreground`), `outline` com borda de 15% e `brand` em turquesa quando a ação é pagar |
| Cartões grandes, cantos de 20 a 36 px, sem sombra e só com borda ou fundo cinza | `surface-card` e `Card` com `rounded-[1.25rem]`, sem sombra. Os painéis de destaque usam 1,75 a 2,25 rem |
| Rótulo pequeno acima do título, sem caixa-alta | `eyebrow` com 0,875 rem, peso 500 e sem `uppercase` |
| Seleção marcada com contorno preto, sem cor | Opções selecionadas (divisão, forma de pagamento, gorjeta e planos) usam anel ou contorno preto |
| Vídeo com celular inclinado em 3D, moedas, palco preto arredondado e barra branca de passos | `PalcoCelular` (`components/tipe/landing/PalcoCelular.tsx`), feito em CSS do zero. Mostra as telas reais da TIPE, o celular gira com a rolagem, as moedas em turquesa têm paralaxe e a barra de passos é clicável |
| Toasts de vidro sobre fotos no hero | `Toast` (`landing/Toast.tsx`) com textos de eventos reais da TIPE ("Mesa 7 pagou", "Dinheiro na Mesa 3") |
| Fotos de pessoas reais trabalhando, recortadas em cartões arredondados | Fotos de restaurantes brasileiros, com o totem real da TIPE no suporte de madeira e nunca uma maquininha |
| Gorjeta em cartões grandes com emoji | Cartões de 2×2 (simulador) ou 3 colunas (conta real) com 🙂 😊 😍 🤩. Nenhum vem pré-selecionado, e "Agora não" tem o mesmo peso |
| Navegação lateral escura e item ativo em pílula clara | Painel do restaurante com o item ativo em pílula preta. O backoffice tem barra lateral quase preta e o item ativo em pílula branca. No celular, as abas viram pílulas roláveis |
| Planos em cartões grandes centrados, com selo "mais popular" | Cartões por número de mesas (`plans.ts`). O selecionado ganha contorno preto |

### Medidas lidas da sunday (getComputedStyle, 1440 e 390 px)

| Elemento | Desktop | Celular |
|---|---|---|
| Título do hero | 64 px, peso 400, entrelinha 0,95, entreletra −0,05em | 32 px |
| Título de seção | 48 px, peso 400, −0,05em | 28 px |
| Título de cartão | 32 px, peso 400 ou 500, −0,03em | 24 px |
| Texto | 16 px / 24 px, peso 400 | igual |
| Botões | pílula, 16 px peso 500, ~48–52 px de altura, 28 px de respiro lateral | igual |
| Seções | 112 px de respiro vertical | 72 px |
| Margem lateral | 56 px, conteúdo quase na largura total | 28 px |
| Cartões | cinza ~#f2f2f2, raio 16–24 px, sem sombra | igual |

A sunday usa só os pesos 400 e 500 e alterna seções brancas com seções pretas puras. Na TIPE, os títulos da landing passaram para peso 400 com entreletra de −0,045em, os negritos viraram 500 e o conteúdo ficou mais largo (84rem, com margem de 56 px no desktop). A seção da Mesa Viva continua em azul-marinho, por decisão anterior.

Não adaptado de propósito: prova social com logos e números de clientes (a TIPE só mostra quando houver dados reais), ranking de desempenho de garçons e sugestão de gorjeta por IA.

---

## 2. Tokens (`src/styles.css`)

**Marca (não alterar os tons-base)**

| Papel | Token | Valor |
|---|---|---|
| Turquesa | `--brand-primary`, `--primary` | `oklch(0.77 0.14 178)` |
| Turquesa para texto em fundo claro (AA) | `--brand-primary-strong` | `oklch(0.5 0.1 182)` |
| Turquesa suave | `--brand-primary-soft` | `oklch(0.95 0.04 178)` |
| Azul-marinho | `--brand-secondary`, `--secondary` | `oklch(0.2 0.04 250)` |
| Laranja (alertas, estrelas) | `--highlight` | `oklch(0.74 0.17 50)` |

**Neutros**

| Token | Valor | Uso |
|---|---|---|
| `--background` | `oklch(1 0 0)` | Página |
| `--background-muted` | `oklch(0.968 0.002 250)` | Faixas, total da conta, hover |
| `--foreground` | `oklch(0.15 0.005 250)` | Texto, botão principal, seleção |
| `--muted-foreground` | `oklch(0.47 0.008 250)` | Texto de apoio |
| `--border` | `oklch(0.915 0.003 250)` | Bordas de cartões e campos |
| `--sidebar` | `oklch(0.15 0.005 250)` | Barra lateral do backoffice |

**Forma:** o `--radius` base é 1 rem. Botões e abas em pílula, campos com 0,9 rem, cartões com 1,25 rem e palcos e painéis de destaque com 1,75 a 2,25 rem.

**Tipografia** (uma família só, `/fonts/inter-tight-latin-var.woff2`, com preload em `__root.tsx`):

| Uso | Tamanho | Peso / entreletra |
|---|---|---|
| Hero da landing | `clamp` até ~6 rem | 500 / −0,04 em |
| Título de página interna (`PageHeader`) | `clamp(2rem, 1.6rem + 1.2vw, 2.75rem)` | 500 / −0,035 em |
| Título de passo (simulador e conta) | 1,9 rem | 500 / −0,035 em |
| Título de painel (`Panel`) | 1,05 rem | 500 |
| Corpo | 0,95 a 1 rem | 400 |
| Rótulo (`eyebrow`, rótulos de campo) | 0,875 rem | 500, sem caixa-alta |
| Números (`money`) | algarismos tabulares | 500 / −0,035 em |

**Movimento** (medido na sunday em 20/10, só observando as páginas públicas; detalhes em `/mnt/project-files/sunday-analise/movimento/README.md`):

| Uso | Valor |
|---|---|
| Curva principal (`--ease-expo`) | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Texto entrando (`Palavras`, `LineReveal`) | palavra por palavra, sobe 15% e aparece em 1,5 s; 140 ms entre palavras nos títulos (35 ms no parágrafo do hero) |
| Blocos (`Reveal`) | 16 px e opacidade, 1,2 a 1,5 s |
| Botões em pílula da landing | 0,4 s; o contornado se preenche de preto no hover |
| Menus (`.menu-in`) | 0,75 s, opacidade e descida de 8 px |
| Cabeçalho | some ao rolar para baixo depois de 300 px e volta ao subir; o "Teste grátis" fica fixo no topo |
| Faixas infinitas (`useVelocidadeFaixa`) | velocidade constante de 50 px/s |

Como na sunday, não há biblioteca de animação, smooth scroll nem paralaxe forte. Rolagem com `requestAnimationFrame` e variável CSS `--p` no palco do celular. Com `prefers-reduced-motion`, nada se move.

---

## 3. Componentes

- `components/ui/button.tsx`: em pílula, nas variantes `default` (preto), `brand` (turquesa), `outline`, `ghost` e `link`, com tamanhos `sm` h-9, padrão h-11 e `lg` h-14.
- `components/ui/input.tsx`: h-12, cantos de 0,9 rem e foco com borda preta.
- `components/tipe/ds.tsx`: `PageHeader`, `StatCard` (valor com tamanho por container query, `@container`, para não estourar em grades estreitas), `Panel`, `EmptyState`, `StatusBadge` e `brl()`.
- `components/tipe/landing/`: `PalcoCelular`, `PhoneShot` (capturas reais em WebP 390/780), `Toast`, `Marcas` (bigodes do título e símbolo oficial) e `EditorialPhoto`.
- `components/tipe/MesaViva.tsx`: a mesa animada da landing.

Regras:
- Cada estado tem cor e texto; não usamos cor sozinha.
- Valores em dinheiro sempre com `money` e `brl()`.
- Sem dado real, o componente mostra `EmptyState`, nunca um número inventado.
- Só aparecem recursos que existem. Decisão do Roberto (15/10): Apple Pay e Google Pay aparecem como formas de pagamento disponíveis.
- Todos os CTAs comerciais levam a `/teste-gratis`.

---

## 4. Onde está aplicado

| Área | Estado |
|---|---|
| Landing (`/`) | Hero "Pague. Sem esperar.", Mesa Viva, palco do celular, foto da dona no tablet e foto do garçom na gorjeta extra |
| Entrar e cadastro | Foto com toasts à esquerda e formulário à direita (`/entrar`); cartões de plano com contorno preto (`/cadastro`) |
| Simulador (`/simulador`) e conta da mesa | Títulos grandes em peso 500, total em cartão cinza, gorjeta em cartões com emoji e seleção em preto |
| Painel do restaurante | Navegação com item ativo em pílula preta, `PageHeader` grande e indicadores sem ícone colorido |
| Área do garçom | Saldo em cartão preto com número de 3,2 rem e abas em pílula |
| Backoffice | Barra lateral quase preta com item ativo em pílula branca, indicadores no novo `Kpi` e abas em pílula no celular |

## 5. Como verificar

- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` e `bun run build`.
- Capturas com Playwright em 1440×900 e 390×844. O harness de telas autenticadas, com dados fictícios do "Maré Alta", fica fora do repositório.
- Comparação lado a lado com as capturas da sunday, feitas nas páginas públicas.
