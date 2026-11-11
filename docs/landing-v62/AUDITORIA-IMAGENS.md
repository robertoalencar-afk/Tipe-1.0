# V62: auditoria das imagens da landing (27/10)

Conferi as 63 imagens de `src/assets/produtos`, `src/assets/fotos` e `src/assets/cenas`
(folhas de contato e zoom nas telas, totens e marcas). A thread do casting do Gemini
("Casting fotográfico com Gemini" e "Geração das cenas do casting") está acessível e foi
lida: o elenco, as fichas aprovadas e os scripts estão em `/mnt/project-files/casting-tipe/`.
Nenhuma imagem foi gerada nesta rodada.

Legenda: **A** pode ficar · **B** edição localizada (grátis, por composição) · **C** gerar de novo (pago).

## B. Edição localizada

| Imagem | Onde aparece | Problema | Correção proposta |
|---|---|---|---|
| `integracoes` | Home (segmentos) e painel | Cartão de papel escrito "Tipe" à mão na bancada: marca falsa. | Remover o cartão por inpainting ou recortar a foto acima dele. |
| `hamburgueria` | Home (segmentos) | Plaquinha "Tipe 12" com letras inventadas na mesa. | Trocar a plaquinha pelo totem real por composição (mesmo método das cenas). |
| `garcom` (produtos) | Card do Staff, /teste-gratis | Selo flutuante "Gorjeta extra +R$ 10" desenhado dentro da foto, com símbolo simplificado. | Apagar o selo da foto; o aviso já existe em HTML por cima. |

## C. Gerar de novo (depende de autorização e créditos)

| Imagem | Onde aparece | Problema |
|---|---|---|
| `cena-garconete-vertical` | Topo do Tipe Staff e home | A tela do celular está virada para a câmera enquanto ela olha para ele: pose encenada. |
| `cena-amigos`, `-larga`, `-vertical` | Abertura, Mesa Viva, fluxo de pagamento | Quatro pessoas mostrando o celular para a câmera ao mesmo tempo. Parece anúncio, não uso real. |
| `cena-praia` | Pay (Mesa Viva) | O celular está de frente para a câmera. |
| `cena-gerente` / `-vertical` | Pay, Restaurant, carrossel | Tablet inclinado para a câmera, não para ela. |
| Cena 5 (Mateus) | Fora do site | Pendente desde 27/10 (créditos), pausado por você. |

Para refazer, a regra 6.2 do pedido vale: gerar a foto com o aparelho em posição natural e
inserir a tela real depois, por máscara e perspectiva (pipeline `aplicar2.py` do casting).

## A. Podem ficar

Todas as outras: `cena-casal` (3 formatos), `cena-familia` e `-vertical`, `cena-executiva`
(corrigida na V6.1), `cena-garcom`, `cena-caixa`, `cena-cozinha`, `cena-bartender`,
`cena-dono`, `cena-mesa-liberada`, `mesa`, `salao`, `pay`, `order`, `pix-mao`, `scan`,
`dividir`, `gestor`, `tablet-maos`, `gorjetas-garcom`, `gorjeta-mao`, `fechamento`, `equipe`,
`kitchen`, `restaurant`, `ai`, `pizzaria`, `boteco`, `japones`, `cafe`, `bistro`, `amigos`,
`casal`, e as seis ilustrações da lebre e da tartaruga. Os totens dessas fotos são a arte real
composta (QR legível, logotipo oficial).

`cena-familia-larga` está no repositório mas não é usada em nenhuma página.

## Marca

- Corrigido: os avisos do Tipe Staff usavam um "Y" desenhado à mão (`TipeSymbol` em
  `src/components/tipe/Logo.tsx`). Agora usam o símbolo oficial (`marca/SimboloTipe.tsx`, mesma
  geometria de `src/assets/marca/tipe-simbolo.svg`).
- Conferido: cabeçalho, rodapé e hub usam `LogoTipe` ou os SVGs oficiais. `TipeSymbol` não é
  mais usado em nenhuma página da landing (continua em telas internas do app).
