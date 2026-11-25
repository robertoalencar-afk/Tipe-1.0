# Capturas das telas reais da conta (`src/assets/telas-reais`)

Telas do QR da mesa (`/$restaurante/$mesa`) capturadas do produto atual, sem banco:
dados fictícios da Maré Alta, Mesa 12 (Lucas, atendido por Joyce). Refeito em 25/11/2026
para seguir a decisão de 11/11: a conta só se divide por itens (sem "Dividir a conta",
"Partes iguais" ou "Escolher itens").

Telas: conta, dividir (itens escolhidos), metodos, pix, pago, gorjeta, gorjeta-metodo,
gorjeta-pix, avaliacao. Valores: total R$ 356,40; Lucas paga ½ baião + caipirinha + pudim
= R$ 89,10 com 10%; gorjeta 5% = R$ 4,46 (R$ 3,12 para a Joyce).

## Refazer

```sh
git apply docs/capturas-telas-reais/mock-captura.patch   # NUNCA commitar: só para capturar
CAPTURA_MOCK=1 TIPE_ALLOW_SIMULATED_PAYMENTS=true \
  VITE_SUPABASE_URL=https://exemplo.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=x \
  SUPABASE_URL=https://exemplo.supabase.co SUPABASE_PUBLISHABLE_KEY=x \
  bunx vite dev --host 127.0.0.1 --port 5179 &
SAIDA=/tmp/telas node docs/capturas-telas-reais/capturar-fluxo-conta.cjs
git checkout src/lib/tipe/payments.functions.ts src/lib/tipe/pdv.functions.ts
```

PNGs 780×1688 (390×844 @2x) → `<nome>-780.webp` e `<nome>-390.webp` (qualidade 84).
Se os valores mudarem, atualize os textos (`AberturaMesa`, `FluxoPagamento`,
`SequenciaCelular`, `MesaViva`, `VideoProduto`) e o vídeo
`docs/landing-v5/video-produto/produto-fluxo.html` (`node render.mjs`).
