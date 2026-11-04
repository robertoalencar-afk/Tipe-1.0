# OpenTable x Tipe Guest (REA passivo, 04/11/2026)

Prints da web pública do OpenTable, tirados no Chrome do REA do Roberto sem navegar, clicar nem rodar
código na página: `/mnt/project-files/tipe-guest/opentable-rea/` (home, busca em Manhattan, página
da La Pecora Bianca). Nada de engenharia reversa.

## O que o OpenTable faz bem e o que o app passou a ter

| OpenTable | Tipe Guest (PR #74) |
| --- | --- |
| Barra única de dia, hora e pessoas, ao lado da busca | Barra pessoas · dia · hora no topo de Descobrir |
| Cartão com 5 horários; o lotado vira um bloco cinza | 5 horários em volta da hora escolhida; o lotado fica cinza **com a hora riscada** (diz qual hora está cheia) |
| "Booked 351 times today" | "Reservado N vezes hoje" no cartão e na página |
| "You're in luck! We still have 4 timeslots left" | "Restam N horários" quando sobram 6 ou menos |
| Etiquetas de clima (Lively, Charming, Good for groups) | Clima do lugar no cartão e na página (Vista para o mar, Romântico...) |
| Salvar restaurante (marcador na foto) | Coração na foto, sempre visível |
| "Notify me" abaixo dos horários | "Avise-me se abrir um horário lotado", que leva à lista de espera |
| Busca por IA ("Describe in your own words") | "Pergunte à Lebre" com sugestões; no app, regras grátis (sem IA paga) |
| Pontos por horário ("+1,000 pts") | Tipe Pontos: 100 por reserva honrada, +300 em horário calmo, 1.000 = R$ 10 de crédito na conta |
| Mapa ao lado da lista | Alternância Lista/Mapa: Apple Maps no iPhone, Google Maps no Android, mapa ilustrativo na web |
| Restaurantes promovidos | "A Lebre recomenda": destaque pago, sempre com o selo "Patrocinado" |

## Onde o Tipe vai além

- A garantia vira **crédito de consumação** na conta e a mesa reconhece a reserva sozinha (Tipe Pay).
- **Fila pela porta**: QR + localização, sem ficar em pé na calçada.
- Pix, Apple Pay e Google Pay na garantia, e a gorjeta vai para quem atendeu.

## Decisões do Roberto (04/11)

- Programa de fidelidade: sim (o Guest exige conta e app). Valores acima são a proposta inicial.
- Mapa: sim.
- "A Lebre recomenda" para restaurantes que pagam um plus. Fica marcado como patrocinado para não
  enganar o cliente (CDC e regras das lojas). O preço do plus e se entra como módulo da assinatura
  (`restaurant_modules`) ainda estão em aberto.
