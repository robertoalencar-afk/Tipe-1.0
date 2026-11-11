# 04: mudanças no design system

O design system continua em `docs/design-system.md` (branch do PR #10). Nesta missão não houve token novo. Mudanças de uso:

| Mudança | Onde | Motivo |
|---|---|---|
| Bloco de destaque do valor: fundo `bg-background-muted`, raio 1,75 rem, valor 2,75 rem peso 500 e entreletra −0,045 em | Conta do cliente (#12) | Valor da conta em destaque absoluto (Sunday mostra o valor no hero de `/digital-bill/`) |
| Títulos da conta (identificação, confirmação, erros) e `DividirConta` de 600–800 para 500 | #12 | A regra do DS é 400/500, sem negrito; a conta ainda tinha `font-semibold` e `font-extrabold` |
| Uma ação principal por tela: a barra fixa só aparece quando há seleção | #12 | Dois botões pretos competiam |
| Lista de avisos com ícone em círculo por estado (turquesa suave = quitada, laranja = confirmar, cinza = pagamento) | Garçom (#13) | Estado legível sem ler o texto; cor nunca sozinha (o título diz o estado) |
