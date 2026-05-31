// E2E: plan gating. free plan blocks e-invoice + e-way bill (403); pro allows e-invoice.
import mongoose from "mongoose";

const BASE = "http://localhost:3000";
const jar = new Map();
const setCookies = (res) => { for (const c of res.headers.getSetCookie?.() ?? []) { const [p] = c.split(";"); const i = p.indexOf("="); jar.set(p.slice(0, i), p.slice(i + 1)); } };
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
const j = () => ({ "content-type": "application/json", cookie: cookie() });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "billeasy" });
  const db = mongoose.connection.db;
  const biz = await db.collection("businesses").findOne({});
  const customer = await db.collection("customers").findOne({ businessId: biz._id, gstin: { $exists: true, $ne: null } });
  const setPlan = (p) => db.collection("businesses").updateOne({ _id: biz._id }, { $set: { plan: p } });

  let res = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookie() } }); setCookies(res);
  const { csrfToken } = await res.json();
  res = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() }, body: new URLSearchParams({ csrfToken, email: "demo@billeasy.test", password: "demo123", callbackUrl: `${BASE}/dashboard` }), redirect: "manual" }); setCookies(res);
  console.log("login:", [...jar.keys()].some((k) => k.includes("session-token")) ? "✓" : "FAIL");

  const lines = [{ description: "Gate Test", hsnSac: "8479", qty: 10, unit: "pcs", rateRupees: 10000, gstRate: 18 }];

  // --- FREE plan: e-invoice + e-way bill should be blocked ---
  await setPlan("free");
  res = await fetch(`${BASE}/api/einvoice/generate`, { method: "POST", headers: j(), body: JSON.stringify({ customerId: customer._id.toString(), docNo: "X", docDate: "31/05/2026", lines }) });
  let d = await res.json();
  console.log("FREE e-invoice -> 403:", res.status === 403, "| code:", d.code);

  // need a >50k invoice to reach the e-way bill plan gate
  res = await fetch(`${BASE}/api/invoices`, { method: "POST", headers: j(), body: JSON.stringify({ customerId: customer._id.toString(), status: "finalized", lines }) });
  const inv = (await res.json()).invoice;
  res = await fetch(`${BASE}/api/ewaybill/generate`, { method: "POST", headers: j(), body: JSON.stringify({ invoiceId: inv.id, mode: "1", distanceKm: 100 }) });
  d = await res.json();
  console.log("FREE e-way bill -> 403:", res.status === 403, "| code:", d.code);

  // --- PRO plan: e-invoice should be allowed ---
  await setPlan("pro");
  res = await fetch(`${BASE}/api/einvoice/generate`, { method: "POST", headers: j(), body: JSON.stringify({ customerId: customer._id.toString(), docNo: "X", docDate: "31/05/2026", lines }) });
  d = await res.json();
  console.log("PRO e-invoice -> 200:", res.status === 200, "| has IRN:", !!d.irn);

  res = await fetch(`${BASE}/api/ewaybill/generate`, { method: "POST", headers: j(), body: JSON.stringify({ invoiceId: inv.id, mode: "1", distanceKm: 100 }) });
  console.log("PRO e-way bill -> 200:", res.status === 200);

  // restore to free for a clean default state
  await setPlan("free");
  await mongoose.disconnect();
  console.log("\nDONE (plan reset to free)");
}
main().catch((e) => { console.error(e); process.exit(1); });
