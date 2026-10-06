import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_restaurants",
  title: "Listar restaurantes",
  description: "Lista os restaurantes TIPE aos quais o usuário conectado tem acesso.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("restaurants").select("name, slug").order("name");
    if (error) return { content: [{ type: "text", text: "Não foi possível listar os restaurantes." }], isError: true };
    const restaurants = (data ?? []).map((r) => ({ name: String(r.name), slug: String(r.slug) }));
    return { content: [{ type: "text", text: JSON.stringify(restaurants) }], structuredContent: { restaurants } };
  },
});
