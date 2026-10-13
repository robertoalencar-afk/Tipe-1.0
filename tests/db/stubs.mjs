// Gera CREATE TABLE IF NOT EXISTS a partir dos tipos gerados do Supabase,
// para tabelas que existem em produção mas não estão no histórico de migrações.
import { readFileSync } from "node:fs";
const src = readFileSync(process.argv[2], "utf8");
const pub = src.slice(src.indexOf("public: {"));
const tables = pub.slice(pub.indexOf("Tables: {"), pub.indexOf("Views: {"));
const re = /\n {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/g;
let m, out = [];
const map = (name, t) => {
  t = t.trim();
  if (/\[\]$/.test(t)) return "text[]";
  if (t.startsWith("Json")) return "jsonb";
  if (t.startsWith("boolean")) return "boolean";
  if (t.startsWith("number")) return "numeric";
  if (t.includes("Database[")) return "text";
  if (name.includes("external") || name.includes("provider_") || name.includes("order_id") || name.includes("subscription_id") || name.includes("event_id") || name.includes("recipient")) return "text";
  if (name === "id" || name.endsWith("_id")) return "uuid";
  if (/(_at|_until)$/.test(name)) return "timestamptz";
  return "text";
};
while ((m = re.exec(tables))) {
  const cols = [...m[2].matchAll(/^ {10}(\w+): (.+)$/gm)].map(([, n, t]) => {
    const nullable = t.includes("| null");
    let type = map(n, t.replace("| null", ""));
    let def = n === "id" && type === "uuid" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : (n === "created_at" || n === "updated_at") ? " DEFAULT now()" : "";
    return `  "${n}" ${type}${def}${nullable || def ? "" : ""}`;
  });
  out.push(`CREATE TABLE IF NOT EXISTS public.${m[1]} (\n${cols.join(",\n")}\n);`);
  for (const c of cols) out.push(`ALTER TABLE public.${m[1]} ADD COLUMN IF NOT EXISTS ${c.trim().replace(/ PRIMARY KEY.*$/, "")};`);
}
console.log(out.join("\n"));
