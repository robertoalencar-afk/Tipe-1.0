import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tables",
  title: "Listar mesas",
  description: "Lista as mesas de um restaurante do usuário, indicando se estão abertas.",
  inputSchema: { slug: z.string().trim().min(1).max(80).describe("Identificador do restaurante, obtido em list_restaurants.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    const db = supabaseForUser(ctx);
    const { data: r } = await db.from("restaurants").select("id, name").eq("slug", slug).maybeSingle();
    if (!r) throw new ToolError("Restaurante não encontrado ou sem acesso.");
    const { data, error } = await db.from("restaurant_tables").select("number, active").eq("restaurant_id", r.id).order("number");
    if (error) throw new ToolError("Não foi possível listar as mesas.");
    const tables = (data ?? []).map((t) => ({ number: String(t.number), open: Boolean(t.active) }));
    return { content: [{ type: "text", text: JSON.stringify({ restaurant: r.name, tables }) }], structuredContent: { restaurant: String(r.name), tables } };
  },
});
