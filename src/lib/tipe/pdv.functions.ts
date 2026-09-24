import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TableBill } from "./rules";

function mockBill(restaurantId: string, tableId: string): TableBill {
  return {
    restaurant: { id: restaurantId, name: "Restaurante Maré Alta" },
    table: { id: tableId, number: tableId },
    waiter: { id: "g-01", name: "Carlos Mendes" },
    items: [
      { id: "1", name: "Moqueca de camarão", qty: 1, unitPrice: 128 },
      { id: "2", name: "Arroz de coco", qty: 1, unitPrice: 24 },
      { id: "3", name: "Caipirinha de caju", qty: 2, unitPrice: 26 },
      { id: "4", name: "Água com gás", qty: 2, unitPrice: 8 },
      { id: "5", name: "Cocada de forno", qty: 1, unitPrice: 22 },
    ],
    paid: 0,
    source: "simulado",
  };
}

// Busca a conta da mesa no PDV Saipos. Sem credenciais, usa dados simulados.
export const getTableBill = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ restaurantId: z.string().max(64), tableId: z.string().max(16) }).parse(d))
  .handler(async ({ data }): Promise<TableBill> => {
    const token = process.env["SAIPOS_API_TOKEN"];
    if (!token) return mockBill(data.restaurantId, data.tableId);
    try {
      const res = await fetch(
        `https://api.saipos.com/v1/stores/${encodeURIComponent(data.restaurantId)}/tables/${encodeURIComponent(data.tableId)}/order`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`Saipos ${res.status}`);
      const j: any = await res.json();
      return {
        restaurant: { id: data.restaurantId, name: j.store_name ?? "Restaurante" },
        table: { id: data.tableId, number: String(j.table_number ?? data.tableId) },
        waiter: { id: String(j.waiter_id ?? ""), name: j.waiter_name ?? "Equipe" },
        items: (j.items ?? []).map((i: any, idx: number) => ({
          id: String(i.id ?? idx), name: i.desc_item ?? i.name, qty: Number(i.quantity ?? 1), unitPrice: Number(i.unit_price ?? 0),
        })),
        paid: Number(j.paid_amount ?? 0),
        source: "saipos",
      };
    } catch (e) {
      console.error("Falha Saipos, usando simulado", e);
      return mockBill(data.restaurantId, data.tableId);
    }
  });
