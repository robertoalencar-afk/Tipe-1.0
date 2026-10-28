// PostgREST falso para teste local: nada sai da máquina. Grava cada insert em leads.jsonl.
import http from "node:http";
import fs from "node:fs";
const LOG = (process.env.FAKE_DIR || "/tmp/tipe-fase8") + "/leads.jsonl";
http.createServer((req, res) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", () => {
    const falhar = fs.existsSync((process.env.FAKE_DIR || "/tmp/tipe-fase8") + "/FALHAR");
    if (req.url.startsWith("/rest/v1/rpc/rate_limit_hit")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end("true");
    }
    if (req.url.startsWith("/rest/v1/restaurant_leads") && req.method === "POST") {
      if (falhar) {
        res.writeHead(500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ message: "falha simulada" }));
      }
      fs.appendFileSync(LOG, b + "\n");
      res.writeHead(201, { "content-type": "application/vnd.pgrst.object+json" });
      return res.end(JSON.stringify({ id: "00000000-0000-4000-8000-000000000001" }));
    }
    res.writeHead(201, { "content-type": "application/json" });
    res.end("[]");
  });
}).listen(5199, "127.0.0.1", () => console.log("fake postgrest 5199"));
