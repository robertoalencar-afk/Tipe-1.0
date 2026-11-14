import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
try {
  await db.exec(`CREATE TABLE plan_catalog(id text primary key, included_modules text[] NOT NULL, updated_at timestamptz DEFAULT now());
    INSERT INTO plan_catalog VALUES ('essencial','{}',now()),('profissional','{totem}',now()),('premium','{order,kds}',now()),('personalizado','{three_d}',now());`);
  const sql = await readFile(new URL("../../../drizzle/migrations/0062_order_cozinha_all_plans.sql", import.meta.url), "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const { rows } = await db.query("SELECT id,included_modules FROM plan_catalog ORDER BY id");
  for (const row of rows) {
    assert(row.included_modules.includes("order"), `${row.id}: Order incluído`);
    assert(row.included_modules.includes("kds"), `${row.id}: Cozinha incluída`);
    assert(!row.included_modules.includes("guest"), "Reserva não é ativada");
    assert.equal(row.included_modules.length, new Set(row.included_modules).size, "migração idempotente");
  }
  assert(rows.find((r) => r.id === "profissional").included_modules.includes("totem"), "preserva módulo negociado");
  assert(rows.find((r) => r.id === "personalizado").included_modules.includes("three_d"), "preserva condições personalizadas");
  console.log("Planos: Order/Cozinha incluídos, módulos existentes preservados e Reserva inativa.");
} finally { await db.close(); }
