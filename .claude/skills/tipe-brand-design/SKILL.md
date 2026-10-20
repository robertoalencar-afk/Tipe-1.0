---
name: tipe-brand-design
description: Use ao criar ou revisar qualquer tela, componente, landing ou material visual da Tipe, para manter a identidade (turquesa, azul-marinho, lebre) com acabamento no nível da Sunday sem copiá-la.
---

# Design da marca Tipe

1. Leia `docs/design-system.md` (tokens e componentes do `main`) e `docs/tipe-v2/design-system.md` (padrões da Tipe 2.0). Se o PR da landing v3 estiver no `main`, leia também o design system v3.
2. Use só tokens existentes de `src/styles.css` (`bg-brand`, `bg-ink`, `brand-soft`, `surface-card`, `font-display`, `money`) e peças de `src/components/tipe/ds.tsx`. Não crie cor nova.
3. Turquesa = ação de pagamento, progresso, marca. Preto/azul-marinho = navegação e seleção. Botões em pílula.
4. Valores em reais sempre com `money` (algarismos tabulares) e `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`.
5. Mascote lebre só em espera, agradecimento e estados vazios; nunca como hero. Logo oficial em `marca/` (pasta do projeto) ou `TipeLogo`.
6. Sunday é referência de qualidade, não de identidade: não use fontes, imagens, ícones ou textos dela. Pesquisa visual só pela REA, passiva.
7. Celular primeiro: teste em 375 px sem rolagem horizontal, alvos de toque ≥ 44 px no fluxo do cliente.
8. Nunca mostre número, depoimento ou integração fictícia como real; dado de demonstração leva a faixa "Demonstração".
