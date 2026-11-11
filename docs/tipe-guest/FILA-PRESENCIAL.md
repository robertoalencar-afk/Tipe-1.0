# Fila de espera presencial (QR da porta + localização)

Decisão do Roberto (03/11/2026): a fila de quem chega sem reserva só aceita quem está no restaurante.
Usamos o QR impresso na porta e uma única conferência de localização no celular.

## Como funciona

1. O dono abre **Reservas › Configurar › Fila presencial**, marca a localização da entrada ("Usar minha
   localização atual" ou latitude/longitude), escolhe o raio (50 a 500 m, padrão 150 m) e o prazo depois do
   aviso (5 a 30 min, padrão 10 min). Imprime o QR.
2. O cliente lê o QR (`/<slug>/fila?t=<token>`), informa nome, pessoas e, se quiser, celular.
3. O celular pede a localização uma vez. O banco (`guest_join_walkin`) confere:
   - QR válido e do mesmo restaurante do endereço;
   - fila aberta e flag `guest.reservations` ligada;
   - precisão até 150 m;
   - distância até o raio, mais uma folga de até 50 m pela imprecisão do GPS.
   As coordenadas **não são gravadas**; fica só "verificado pelo QR no local" e a hora.
4. A página acompanha a posição a cada 15 s. Quando a equipe toca **Avisar mesa pronta**, o cliente vê
   "Sua mesa está pronta, apresente-se até HH:MM".
5. A equipe fecha com **Sentou** ou **Desistiu**. O cliente pode **Sair da fila** (com confirmação).
6. Quem chegou sem celular entra por **Incluir na fila** no painel (verificado pela recepção).

## Segurança

- Todas as funções do banco são só `service_role`; o servidor aplica limite por IP e por usuário.
- O mesmo aparelho não entra duas vezes (chave aleatória guardada no navegador).
- Trocar o QR invalida os impressos (só o dono). O token do QR só é enviado ao dono.
- `Permissions-Policy` passou de `geolocation=()` para `geolocation=(self)`: sem isso o navegador bloqueava
  a localização em todo o site. Continua proibida para sites de terceiros embutidos.

## Limites conhecidos

- GPS dentro de prédios pode errar; por isso a folga e a opção da recepção.
- Quem fotografar o QR e estiver longe é barrado pela distância; quem falsificar GPS no aparelho não é.
  A recepção sempre confirma na hora de sentar.
- Sem SMS/WhatsApp nesta versão (custo): o aviso aparece na página aberta.

## Testes

- `tests/db/guest-fila.sql`: 28 cenários (token, raio, precisão, flag, duplicidade, papéis, aviso, saída).
- `src/lib/tipe/guest/fila.test.ts`: distância e raio iguais ao banco.
