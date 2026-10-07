import type { AdaptadorPdv, EventoRecebido } from "../types";

// ADAPTADOR MODELO (vazio). Copie este arquivo para criar um adaptador novo.
// Ele NÃO está registrado em registry.server.ts e não aparece para o restaurante.
// Veja docs/COMO-CRIAR-ADAPTADOR.md.

export const modelo: AdaptadorPdv = {
  id: "modelo", // 1. id único, minúsculo, sem espaços (a-z, 0-9, _)
  nome: "Modelo", // 2. nome exibido no painel quando a integração estiver ativa
  visivelParaRestaurante: false,

  // 3. Declare o que o sistema suporta. O resto da plataforma se adapta a isso.
  capacidades: () => ({ webhook: true, consultaPeriodica: false, devolvePagamento: false, exigeCredenciais: true }),

  // 4. AUTENTICAÇÃO: valide as credenciais na API do sistema. Elas são salvas
  //    criptografadas pela TIPE; nunca as registre em log nem as devolva ao navegador.
  async conectar(_ctx, _credenciais) {
    return { ok: false, erro: "Não implementado" };
  },
  async testarConexao(_ctx) {
    return { ok: false, erro: "Não implementado" };
  },
  async desconectar(_ctx) {},

  async listarMesas(_ctx) {
    return [];
  },

  // 5. MAPEAMENTO: converta a conta do sistema em eventos canônicos (item_added etc.).
  async buscarConta(_ctx, _mesa): Promise<EventoRecebido[]> {
    return [];
  },

  // 6. WEBHOOK: valide a assinatura/segredo enviado pelo sistema.
  async validarWebhook(_request, _corpo, _segredoHash) {
    return false;
  },
  //    ...e traduza o payload. Cada evento precisa de um eventId estável
  //    (o mesmo evento reenviado deve ter o mesmo id, para não duplicar itens).
  receberEvento(_payload): EventoRecebido[] {
    return [];
  },

  // 7. CONSULTA PERIÓDICA (sistemas sem webhook): só é chamada para mesas abertas.
  async sincronizar(_ctx, _mesa): Promise<EventoRecebido[]> {
    return [];
  },

  // 8. DEVOLUÇÃO: avise o sistema que itens foram pagos, se ele permitir.
  async informarPagamento(_ctx, _pagamento) {
    return { ok: false, erro: "Não suportado" };
  },
};
