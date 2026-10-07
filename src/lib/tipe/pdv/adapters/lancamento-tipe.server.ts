import type { AdaptadorPdv } from "../types";

// Adaptador 1: "Lançamento TIPE". Os pedidos são lançados no próprio painel
// (cardápio TIPE → mesa → confirmar) pelas RPCs pdv_launch_order / pdv_void_item.
// Não recebe webhook nem precisa de credenciais: está sempre disponível,
// inclusive como reserva quando uma integração externa cair.
export const lancamentoTipe: AdaptadorPdv = {
  id: "lancamento_tipe",
  nome: "Lançamento TIPE",
  visivelParaRestaurante: true,
  capacidades: () => ({ webhook: false, consultaPeriodica: false, devolvePagamento: false, exigeCredenciais: false }),
  conectar: async () => ({ ok: true }),
  testarConexao: async () => ({ ok: true }),
  desconectar: async () => {},
  listarMesas: async () => [],
  buscarConta: async () => [],
  validarWebhook: async () => false,
  receberEvento: () => [],
  sincronizar: async () => [],
  informarPagamento: async () => ({ ok: true }),
};
