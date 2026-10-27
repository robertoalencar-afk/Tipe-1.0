// Rotinas agendadas da TIPE (antes eram agendadas pela Lovable).
//   a cada minuto:   POST /api/public/pdv/sync          (PDVs sem webhook)
//   a cada 5 minutos: POST /api/public/payments/reconcile (pagamentos presos)
const JOBS = {
  "* * * * *": ["/api/public/pdv/sync"],
  "*/5 * * * *": ["/api/public/payments/reconcile"],
};

export default {
  async scheduled(event, env, ctx) {
    const paths = JOBS[event.cron] ?? [];
    ctx.waitUntil(
      Promise.all(
        paths.map(async (path) => {
          const res = await env.APP.fetch(`https://tipe.digital${path}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
          });
          if (!res.ok) console.error("cron", path, res.status, (await res.text()).slice(0, 200));
        }),
      ),
    );
  },
};
