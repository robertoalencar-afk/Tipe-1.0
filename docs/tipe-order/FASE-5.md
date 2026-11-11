# Tipe Order 1.0 · Fase 5: página comercial

Data: 27/10/2026. Branch `order/landing`, a partir de `redesign-landing-v6`.

A página `/produtos/order` evoluiu dentro da estrutura que já existia: mesma rota (`produtos.$produto.tsx`), mesmo cabeçalho, rodapé "Focinho vivo", tipografia e componentes (`Secao`, `Titulo`, `Foto`, `CelularReal`, `SequenciaCelular`, `TrilhoProdutos`). Não foi criada rota nova nem outro site.

## 1. O que foi feito

### Estado de lançamento configurável (4 estados)

| Estado | CTA | Selo (menu, cards, rodapé, topo) | "Quando estará disponível?" |
|---|---|---|---|
| `em-desenvolvimento` (padrão) | Quero conhecer | Em desenvolvimento | Em desenvolvimento, sem data de lançamento; avisamos quando abrir o acesso antecipado |
| `acesso-antecipado` | Solicitar acesso antecipado | Acesso antecipado | Acesso antecipado para um grupo pequeno; sem data para a disponibilidade geral |
| `piloto` | Solicitar demonstração | Em piloto | Em piloto com restaurantes selecionados; sem data para a disponibilidade geral |
| `disponivel` | Contratar | (sem selo) | Já disponível, como módulo adicional do Tipe Pay |

Nenhuma resposta tem data, mês ou número (um teste unitário confere isso).

- `src/lib/tipe/launch-state.ts`: estados, textos de cada estado, padrão do catálogo (`order: em-desenvolvimento`). Código puro.
- `src/lib/tipe/launch-state.functions.ts`:
  - `getLaunchState(slug)`: pública. Lê `product_launch_states` com service_role. Se a tabela não existir, estiver vazia, der erro ou faltar Supabase, devolve o padrão do catálogo (`fonte: "padrao"`). Em desenvolvimento (`import.meta.env.DEV`) aceita a variável de teste `TIPE_LAUNCH_STATE_OVERRIDE="order=piloto"`. No build de produção esse trecho sai: `grep` em `.output` não encontra a variável.
  - `listLaunchStates` e `setLaunchState`: só fundador com 2FA (`requireFounder2fa`). A mudança é registrada em `security_events` (`product_launch_state_changed`, `antes -> depois`).
- `src/components/tipe/LaunchStatesAdmin.tsx`: controle simples na aba Governança do backoffice existente (`/backoffice`, ao lado do limite da Lebre). Não é um painel novo.
- `src/components/tipe/site/useLancamento.ts`: estado no navegador. No SSR e na hidratação vale o padrão do catálogo; depois há uma chamada por carregamento. A página do produto semeia o valor que o loader já trouxe.
- O tipo `Status` do catálogo não mudou: Guest continua `em-breve` e mostra "Em breve".
- O selo novo aparece no menu Produtos (desktop e celular), no rodapé, nos cards do trilho e nas abas da home.

### Migração (criada e **não aplicada**)
- `drizzle/migrations/0028_product_launch_states.sql`: tabela `product_launch_states (product_slug text pk, state text check (4 estados), updated_by uuid, updated_at timestamptz)`, com RLS ligado, sem políticas e sem grant para `anon`/`authenticated` (só `service_role`). Não cria linha: sem linha, vale o padrão.
- `meta/_journal.json` (idx 23, tag `0028_product_launch_states`) e `meta/0028_snapshot.json` (vazio, como os anteriores; `prevId` = 0022).
- O número 0027 ficou livre (reservado para o produto). **Atenção:** a branch `integracao/colibri-c-pedido-mesa` já tem 0023 e 0024 no journal. Ao juntar, o journal precisa ser reordenado.
- Só foi aplicada num Postgres 16 local descartável (veja a seção 3). Não foi aplicada no Supabase nem no Lovable.

### Seções da página (`src/components/tipe/site/order/PaginaOrder.tsx`)
1. **Topo "Peça sem esperar."** (H1 único). Foto da barraca de praia, um card "Mesa 12 · um QR Code" com os caminhos **Pedir** e **Pagar**, e o celular rodando cardápio → pedido → conta → formas de pagamento. Abaixo dos botões há uma linha honesta com a fase atual e o aviso "telas do cardápio com dados de exemplo".
2. **"Um QR Code. Toda a experiência."**: Escaneie (suporte de mesa real), Escolha (cardápio), Peça (pedido), Pague (formas de pagamento do Tipe Pay). Cada imagem tem rótulo visível.
3. **Pay e Order**: o Pay fecha a conta e o Order abre o pedido. O Order aparece como módulo adicional, no mesmo QR Code. Na coluna do Pay: Apple Pay, Google Pay, Pix ou pagar no estabelecimento (sem "em breve"), dividir e a gorjeta extra opcional depois, como segundo pagamento, sem cartão digitado.
4. **Tudo conectado**: Order → Cozinha → Staff → Pay, com links para as páginas de cada produto.
5. **Benefícios** sem percentuais nem números inventados. Ficaram só os fatos do produto "1 QR Code" e "0 aplicativos". O fato "Ao vivo" saiu.
6. **Tipe 3D Studio e "Ver na minha mesa"**, com selo "Em desenvolvimento" e o texto "Ainda não existem no produto e não têm data". Não há tela fingindo que existe.
7. **Dúvidas**: a primeira é "Quando estará disponível?", com a resposta do estado. Depois vêm Pay obrigatório, como paga, PDV e implantação.
8. **CTA final com formulário** (`#quero-o-order`).
9. Trilho dos outros produtos (o mesmo das outras páginas).

### Formulário e leads (`src/components/tipe/site/order/FormularioOrder.tsx`)
- Reaproveita o `submitLead` (tabela `restaurant_leads`, lida em `/admin/leads`). O enum `originPage` ganhou `"tipe-order"`. A coluna `origin_page` é `text` nos tipos gerados e nenhuma migração do repositório tem CHECK sobre ela, por isso não houve migração. A gravação também preenche as notas do CRM: "Interesse: Tipe Order (estado na hora do cadastro: …)".
- Os campos exigidos são os mesmos do `submitLead`: nome, WhatsApp, e-mail, restaurante, cidade e UF, cargo, mesas, PDV e maquininha. Todos têm rótulo visível e validação ao sair do campo; o erro some quando o campo fica certo, e o envio leva o foco ao primeiro campo com erro.
- LGPD: aceite obrigatório da Política de Privacidade (com link) e opt-in de novidades opcional e desmarcado, no mesmo padrão do `WaitlistForm`.
- A confirmação só aparece depois que o servidor responde ok. Se a resposta falha, aparece um erro honesto ("Seus dados não foram salvos"), com link para o WhatsApp.
- Analytics: `trackProduto()` em `tracking.ts` (clique no CTA, lead ok, lead com erro) e `trackLead()`, os dois só com consentimento de medição. Os IDs de GA4 e do Pixel continuam vazios no código, então nada é enviado hoje.
- Correção junto: o `__root.tsx` tratava `/produtos/x` como página de mesa (`/:restaurante/:mesa`) e nunca carregava a medição nas páginas de produto. `produtos` entrou na lista de exceções.

### Imagens
- **Telas reais do cardápio** (`src/assets/telas-reais/cardapio-*.webp`, `pedido-*.webp`): são capturas do componente real `MesaPedido.tsx` do PR #8 (branch `integracao/colibri-c-pedido-mesa`), copiado sem mudanças. Usei um harness temporário de Playwright: o topo e as abas foram copiados da rota da mesa daquela branch e o cardápio é de exemplo (Maré Alta, mesa 12). O harness não foi versionado. Na página, as telas aparecem como "Tela do Tipe Order · dados de exemplo". O cardápio real não tem fotos de prato, e a página não promete fotos.
- As fotos são as já existentes (`cena-praia`, `cena-amigos`, `cena-bartender`, totem). Não usei API paga de imagem, nem texto, imagem ou código da Sunday.

### SEO e acessibilidade
- Title, description, `og:title/description/url/image/locale/site_name`, `twitter:card` e canonical. Os campos `og:image` e `twitter:*` passaram a valer para todas as páginas de produto, com a foto do produto em URL absoluta.
- JSON-LD `SoftwareApplication` "Tipe Order", parte do "Tipe Pay", **sem preço** (sem `offers`).
- Um único H1 em todas as larguras. A página respeita `prefers-reduced-motion` (componentes de movimento existentes; o celular fica parado na primeira tela). Não há rolagem horizontal. Botões e campos têm pelo menos 44 px.

## 2. Arquivos
Novos: `src/lib/tipe/launch-state.ts`, `launch-state.functions.ts`, `launch-state.test.ts`, `src/components/tipe/LaunchStatesAdmin.tsx`, `src/components/tipe/site/useLancamento.ts`, `src/components/tipe/site/order/PaginaOrder.tsx`, `order/FormularioOrder.tsx`, `drizzle/migrations/0028_product_launch_states.sql`, `meta/0028_snapshot.json`, 4 imagens em `src/assets/telas-reais/`, `docs/tipe-order/`.
Alterados: `produtos.$produto.tsx` (loader com estado, SEO, JSON-LD), `ProdutoPagina.tsx` (desvio para o Order, `ListaDuvidas` e `Relacionados` exportados), `produtos.ts` (textos do Order sem "fase final", fatos sem número inventado, recurso sem "fotos"), `LandingChrome.tsx`, `CardProduto.tsx`, `Home.tsx` (selo por estado), `CelularReal.tsx`, `TelaReal.tsx`, `SequenciaCelular.tsx` (telas novas), `leads.functions.ts`, `tracking.ts`, `__root.tsx`, `backoffice.tsx`, `meta/_journal.json`.

## 3. Testes e saídas reais

| Teste | Resultado |
|---|---|
| `bun run build` | sucesso (saída 0) |
| `npx tsc --noEmit` | sem erros (saída 0) |
| `npx vitest run` | 11 arquivos, 112 testes, todos passando (inclui 6 novos de `launch-state.test.ts`) |
| Migração 0028 em Postgres 16 local descartável (porta 55432, apagado no fim) | aplicada duas vezes sem erro; `service_role` insere e lê; estado `beta` → `violates check constraint`; `anon` lendo → `permission denied`; `authenticated` escrevendo → `permission denied` |
| Playwright 375/390/768/1280/1440 px (`vite dev`) | 0 erro de console, `scrollWidth − innerWidth = 0`, 1 H1 ("Peça sem esperar."), JSON-LD presente, og:* presentes. Único alvo abaixo de 44 px: o link "Política de Privacidade" dentro do texto do aceite (link em linha; o rótulo inteiro tem 44 px) |
| `prefers-reduced-motion: reduce` em 390 px | 0 erro, sem rolagem horizontal |
| Links da página | todos os internos respondem 200; âncoras `#como-funciona`, `#quero-o-order` e `#conteudo` existem. `#top` (do rodapé, já existente) não tem alvo, mas o navegador trata como topo. WhatsApp e Instagram são externos e não foram testados |
| Formulário, validação | o envio vazio mostra 10 erros por campo e leva o foco ao primeiro campo; nada vai ao servidor |
| Formulário, **erro real** | sem Supabase no ambiente, o servidor respondeu `Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY`; a página mostrou "Não conseguimos registrar o seu contato agora. Seus dados não foram salvos…" (390 e 1280 px) |
| Formulário, **sucesso** | **com mock**: a resposta da server function foi interceptada no Playwright (`{ok:true,…}` serializado). A tela de confirmação apareceu só depois dessa resposta. Nenhum lead foi gravado de verdade |
| 4 estados | dev server reiniciado 4 vezes com `TIPE_LAUNCH_STATE_OVERRIDE=order=<estado>` (o caminho completo passa pela server function). CTA do topo, selo do topo, selo do rodapé, título e botão do formulário e resposta de "Quando estará disponível?" mudaram como na tabela da seção 1. Em `disponivel`, nenhum selo. 0 erro de console |

**Não testado de verdade:** a leitura e a escrita no Supabase real (tabela não aplicada); o controle do backoffice com login de fundador e 2FA (não há sessão no ambiente: o componente compila e tipa, mas não rodou); o envio real de lead e dos e-mails; os eventos de GA4/Pixel (IDs vazios).

## 4. Capturas
- Todas: `/mnt/project-files/tipe-order/landing/`. São páginas inteiras e topos nas 5 larguras, movimento reduzido, os 4 estados (topo, menu e formulário), a validação, o erro e o sucesso (mock) do formulário, as telas reais do cardápio e as saídas `qa-final.json`, `estados.out`, `links.out` e `pgtest.out`.
- No PR: `docs/tipe-order/landing/` (12 capturas em webp).

## 5. Situação

**Implementado e testado:** os 4 estados com fallback para o padrão (via variável de teste), as seções da página, o SEO, o JSON-LD, o H1 único, a ausência de rolagem horizontal, as larguras de 375 a 1440 px, o movimento reduzido, a validação do formulário, o erro honesto, a migração em Postgres local e os testes unitários.

**Implementado sem validação:** a leitura do estado vindo do banco real; o `setLaunchState` e o controle do backoffice (fundador com 2FA, log em `security_events`); a gravação do lead com `origin_page = "tipe-order"` e as notas no Supabase real (o banco de produção pode ter uma restrição em `origin_page` que não está no repositório; não encontrei nenhuma); os eventos de analytics.

**Pendente:**
- Aplicar a migração 0028 no Supabase (Lovable) e regenerar `types.ts` (o código usa `as never` até lá).
- Reordenar o journal se o PR #8 (0023/0024) entrar antes.
- Quando o PR #8 entrar no main, refazer as capturas do cardápio a partir do main.
- Mostrar `origin_page = tipe-order` com rótulo próprio e filtro em `/admin/leads` (hoje aparece como texto cru em "Página de origem").

**Fora do escopo:** o produto Tipe Order em si (pedido, KDS, migração 0027), o Tipe 3D Studio, o "Ver na minha mesa", os preços e a integração com PDV.

## 6. Decisões para o Roberto
1. **Qual estado ligar.** O padrão é `em-desenvolvimento` ("Quero conhecer"), o único que é verdade enquanto o PR #8 não estiver em produção. Recomendo passar para `acesso-antecipado` só quando houver um restaurante pronto para usar o pedido pela mesa, e para `piloto` quando houver um restaurante real usando.
2. **Tipe 3D Studio e "Ver na minha mesa".** Estão na página como "Em desenvolvimento, sem data", como foi pedido. Se não estiverem no plano próximo, a seção pode sair sem afetar o resto.
3. **Campos do formulário.** O formulário pede PDV e maquininha porque o `submitLead` exige os dois. Dá para deixá-los opcionais quando `originPage = tipe-order` e encurtar o formulário. Isso mexe na validação compartilhada.
4. **Selo "Em desenvolvimento" no menu.** É mais longo que "Em breve". Cabe nas 5 larguras testadas, mas, se preferir algo mais curto, basta mudar o `selo` em `launch-state.ts`.
