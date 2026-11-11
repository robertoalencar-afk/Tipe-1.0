// Executa PostgreSQL isolado em WASM; não acessa produção.
const { PGlite } = await import(process.env["PGLITE_MODULE"] || "@electric-sql/pglite");
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const read = (p) => readFile(new URL("../../../" + p, import.meta.url), "utf8");
await db.exec(await read("scripts/db/tests/lebre-operation.fixture.sql"));
await db.exec(await read("scripts/db/tests/lebre-launch-baseline.sql"));
await db.exec(
  await read("drizzle/migrations/0060_lebre_operation_proposals.sql"),
);
const rid = "10000000-0000-0000-0000-000000000001",
  uid = "20000000-0000-0000-0000-000000000001",
  wid = "30000000-0000-0000-0000-000000000001";
await db.query("INSERT INTO auth.users VALUES ($1)", [uid]);
await db.query("INSERT INTO restaurants VALUES ($1,'teste',true)", [rid]);
await db.query("INSERT INTO user_roles VALUES ($1,$2,'owner')", [uid, rid]);
await db.query(
  "INSERT INTO restaurant_tables(restaurant_id,number,active,session_token,waiter_id) VALUES ($1,'A1',true,'session',$2)",
  [rid, wid],
);
await db.query("INSERT INTO pdv_waiters VALUES ($1,$2,$3,'Garçom',true)", [
  wid,
  uid,
  rid,
]);
await db.query(
  "INSERT INTO pdv_menu_items(restaurant_id,code,name,price,sector,available) VALUES ($1,'p','Prato',10,'cozinha',true)",
  [rid],
);
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid]);
let count = 0;
const payload = (action) => ({
  action,
  number: "A1",
  ...(action === "launch_order" ? { items: [{ name: "Prato", qty: 2 }] } : {}),
});
async function proposal(action = "launch_order", patch = {}) {
  const id = crypto.randomUUID(),
    p = payload(action),
    snapshot = {
      session: "session",
      waiter_id: wid,
      items: [{ code: "p", name: "Prato", price: 10, qty: 2 }],
      ...patch,
    };
  await db.query(
    "INSERT INTO lebre_operation_proposals(id,restaurant_id,actor_id,payload,snapshot) VALUES ($1,$2,$3,$4,$5)",
    [id, rid, uid, p, snapshot],
  );
  return { id, p };
}
const execute = ({ id, p }, slug = "teste") =>
  db.query("SELECT lebre_execute_operation($1,$2,$3) AS result", [id, slug, p]);
async function fails(fn, pattern) {
  await assert.rejects(fn, pattern);
  count++;
}
await fails(
  () => execute({ id: crypto.randomUUID(), p: payload("open_table") }),
  /inválida/,
);
let prop = await proposal();
await fails(
  () => execute({ ...prop, p: { ...prop.p, number: "999" } }),
  /inválida/,
);
await fails(() => execute(prop, "outro"), /inválida/);
await db.query("UPDATE user_roles SET role='founder'");
await fails(() => execute(prop), /permissão/);
await db.query("UPDATE user_roles SET role='owner',suspended=true");
await fails(() => execute(prop), /permissão/);
await db.exec("UPDATE user_roles SET suspended=false");
await db.exec("UPDATE pdv_menu_items SET price=12");
await fails(() => execute(prop), /Cardápio alterado/);
await db.exec("UPDATE pdv_menu_items SET price=10");
await db.exec("UPDATE pdv_menu_items SET available=false");
await fails(() => execute(prop), /indisponível/);
await db.exec("UPDATE pdv_menu_items SET available=true");
await db.exec("UPDATE restaurant_tables SET session_token='changed'");
await fails(() => execute(prop), /mudou de conta/);
await db.exec("UPDATE restaurant_tables SET session_token='session'");
await db.exec("UPDATE restaurant_tables SET active=false");
await fails(() => execute(prop), /inativa/);
await db.exec("UPDATE restaurant_tables SET active=true");
await db.exec("UPDATE pdv_waiters SET active=false");
await fails(() => execute(prop), /Garçom inválido/);
await db.exec("UPDATE pdv_waiters SET active=true");
let expired = await proposal();
await db.query(
  "UPDATE lebre_operation_proposals SET created_at=now()-interval '11 minutes' WHERE id=$1",
  [expired.id],
);
await fails(() => execute(expired), /expirada/);
for (const qty of [0, 100, 1.5]) {
  const invalid = await proposal("launch_order", {
    items: [{ code: "p", name: "Prato", price: 10, qty }],
  });
  await fails(() => execute(invalid), /Quantidade/);
}
let missing = await proposal();
missing.p.number = "999";
await db.query("UPDATE lebre_operation_proposals SET payload=$1 WHERE id=$2", [
  missing.p,
  missing.id,
]);
await fails(() => execute(missing), /inexistente/);
const first = await execute(prop),
  again = await execute(prop);
assert.deepEqual(first.rows, again.rows);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM pdv_orders")).rows[0].n,
  1,
);
count++;
for (const role of ["waiter", "cashier", "manager", "owner"]) {
  await db.query("UPDATE user_roles SET role=$1", [role]);
  const close = await proposal("close_table");
  if (role === "waiter") await fails(() => execute(close), /permissão/);
  else {
    await execute(close);
    count++;
    await db.exec("UPDATE restaurant_tables SET session_token='session'");
  }
}
await db.exec(
  "UPDATE user_roles SET role='waiter'; UPDATE restaurant_tables SET active=false; SELECT set_config('test.table_limit','yes',false)",
);
const open = await proposal("open_table");
await fails(() => execute(open), /limite/);
await db.exec(
  "SELECT set_config('test.table_limit','no',false); SELECT set_config('test.fail_open','yes',false)",
);
await fails(() => execute(open), /unavailable/);
assert.equal(
  (await db.query("SELECT active FROM restaurant_tables")).rows[0].active,
  false,
);
count++;
await db.exec("SELECT set_config('test.fail_open','no',false)");
await execute(open);
count++;
await db.exec("UPDATE restaurants SET has_order=false");
await execute(await proposal("open_table"));
count++;
console.log(
  `${count} verificações SQL aprovadas; 1 único pedido após repetição; rollback na falha de abertura.`,
);
await db.close();
