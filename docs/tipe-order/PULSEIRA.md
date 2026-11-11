# Tipe Pulseira e Tipe Localiza (planejado)

- Pulseira NFC gravada pela Tipe, numerada, com QR de reserva. O restaurante não grava nada.
- Central Tipe emite lotes; Tipe Gestão → Pulseiras ativa, vincula a uma comanda, bloqueia e reutiliza. Encerrar exige comanda paga e limpa sessão e localização.
- Cada pulseira tem URL segura própria. O número sozinho nunca dá acesso a dados privados nem a pagamento. Isolamento por restaurante.
- **Tipe Localiza**: mapa do evento por setores; localização do celular só com consentimento e durante o atendimento, mostrando precisão e última atualização. "Localizar cliente" no Tipe Equipe. Pronto para BLE/UWB no futuro. NFC não rastreia; GPS é impreciso em ambiente fechado.
- **Android**: ligar o NFC, aproximar o celular da pulseira, abrir o link. **iPhone** (7 em diante): aproximar o topo do celular; sem NFC, ler o QR da pulseira.
- Perda: bloquear no Tipe Gestão; a comanda continua do cliente.
