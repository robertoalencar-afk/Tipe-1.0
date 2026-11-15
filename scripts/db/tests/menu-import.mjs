import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const rid = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${rid}'::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TYPE app_role AS ENUM ('owner','cashier');CREATE FUNCTION has_restaurant_role(uuid,uuid,app_role[]) RETURNS boolean LANGUAGE sql AS $$SELECT $2::text=current_setting('test.rid',true) AND current_setting('test.role',true)='owner'$$;
CREATE TABLE restaurants(id uuid primary key,slug text);CREATE TABLE pdv_menu_categories(id uuid primary key default gen_random_uuid(),restaurant_id uuid,name text,position integer);
CREATE TABLE pdv_menu_items(id uuid primary key default gen_random_uuid(),restaurant_id uuid,category_id uuid,code text,name text,description text,price numeric,available boolean,image_url text,depth_url text,unique(restaurant_id,code));
INSERT INTO restaurants VALUES('${rid}','bistro'),('${other}','other');INSERT INTO pdv_menu_items(restaurant_id,code,name,price,available) VALUES('${rid}','OLD','Original',42,true),('${other}','OTHER','Outro restaurante',99,true);
GRANT SELECT,INSERT,UPDATE ON restaurants,pdv_menu_categories,pdv_menu_items TO authenticated;
SELECT set_config('test.rid','${rid}',false),set_config('test.role','owner',false);`);
await db.exec(
  await readFile(
    new URL("../../../drizzle/migrations/0065_menu_import_posts.sql", import.meta.url),
    "utf8",
  ),
);
const rows = [
  {
    code: "IABCDEF01000",
    name: "Prato",
    category: "Pratos",
    description: "Descrição revisada",
    price: 29.9,
    image_url: "https://example.com/photo.jpg",
    depth_url: "https://example.com/depth.png",
  },
];
await db.exec("SET ROLE authenticated");
const call = (r = rows, replace = false, slug = "bistro") =>
  db.query("SELECT publish_menu_import($1,$2,$3) n", [slug, JSON.stringify(r), replace]);
assert.equal((await call()).rows[0].n, 1);
await call();
assert.equal((await db.query("SELECT count(*)::int n FROM pdv_menu_items")).rows[0].n, 3);
await assert.rejects(call(rows, false, "other"), /dono/);
await db.exec("SELECT set_config('test.role','cashier',false)");
await assert.rejects(call(), /dono/);
await db.exec("SELECT set_config('test.role','owner',false)");
await assert.rejects(
  call([...rows, { ...rows[0], code: "IABCDEF01001", price: null }], true),
  /preço/,
);
assert.equal(
  (await db.query("SELECT available FROM pdv_menu_items WHERE code='OLD'")).rows[0].available,
  true,
  "failed replace rolls back availability",
);
for (const patch of [
  { description: "" },
  { image_url: null },
  { depth_url: null },
  { category: "Para organizar" },
])
  await assert.rejects(call([{ ...rows[0], ...patch }], true), /preço/);
await call(rows, true);
assert.equal(
  (await db.query("SELECT available FROM pdv_menu_items WHERE code='OLD'")).rows[0].available,
  false,
);
assert.equal(
  (await db.query("SELECT available FROM pdv_menu_items WHERE code='OTHER'")).rows[0].available,
  true,
);
assert.equal(
  (await db.query("SELECT available FROM pdv_menu_items WHERE code='IABCDEF01000'")).rows[0]
    .available,
  true,
);
assert.equal((await db.query("SELECT count(*)::int n FROM pdv_menu_categories")).rows[0].n, 1);
await assert.rejects(call([rows[0], rows[0]]), /repetidos/);
await db.exec("RESET ROLE;SET ROLE anon");
await assert.rejects(call(), /permission/);
await db.close();
console.log(
  "Menu import SQL: owner, isolation, idempotency, atomic rollback, replacement preserving history passed.",
);
