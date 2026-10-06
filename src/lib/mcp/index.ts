import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRestaurants from "./tools/list-restaurants";
import listTables from "./tools/list-tables";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "type-1-0",
  title: "Type 1.0",
  version: "0.1.0",
  instructions: "Ferramentas da TIPE para restaurantes. Use list_restaurants para descobrir os restaurantes do usuário e list_tables para ver as mesas de um deles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listRestaurants, listTables],
});
