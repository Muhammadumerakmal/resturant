// Concurrent-order load test for NFR §8 (>=10 concurrent orders, <2s each).
// Usage: node scripts/loadtest.mjs [count]   (default 10). API_BASE overridable.
const BASE = process.env.API_BASE ?? "http://localhost:4000";
const N = Number(process.argv[2] ?? 10);

const menuRes = await fetch(`${BASE}/api/v1/menu`);
if (!menuRes.ok) {
  console.error(`Cannot reach backend menu at ${BASE} (HTTP ${menuRes.status}). Is it running?`);
  process.exit(1);
}
const menu = await menuRes.json();
const id = menu[0].id;

async function placeOrder() {
  const t0 = performance.now();
  const res = await fetch(`${BASE}/api/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "manual", items: [{ menu_item_id: id, quantity: 1 }] }),
  });
  return { ok: res.status === 201, status: res.status, ms: performance.now() - t0 };
}

console.log(`Firing ${N} concurrent orders at ${BASE} ...`);
const wall0 = performance.now();
const results = await Promise.all(Array.from({ length: N }, placeOrder));
const wall = performance.now() - wall0;

const oks = results.filter((r) => r.ok).length;
const times = results.map((r) => r.ms).sort((a, b) => a - b);
const q = (p) => times[Math.min(times.length - 1, Math.floor(p * times.length))];
const slowest = times[times.length - 1];

console.log(`success:     ${oks}/${N}`);
console.log(`latency ms:  min ${times[0].toFixed(0)} · p50 ${q(0.5).toFixed(0)} · p95 ${q(0.95).toFixed(0)} · max ${slowest.toFixed(0)}`);
console.log(`wall clock:  ${wall.toFixed(0)}ms`);
console.log(`NFR §8 (<2000ms/order): ${slowest < 2000 ? "PASS" : "FAIL"}`);

process.exit(oks === N && slowest < 2000 ? 0 : 1);
