// E2E: login -> create a >50k invoice -> generate e-way bill -> verify persisted + threshold guard.
import mongoose from "mongoose";

const BASE = "http://localhost:3000";
const jar = new Map();
const setCookies = (res) => {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";"); const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
};
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
const j = () => ({ "content-type": "application/json", cookie: cookie() });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "billeasy" });
  const db = mongoose.connection.db;
  const business = await db.collection("businesses").findOne({});
  const customer = await db.collection("customers").findOne({ businessId: business._id, gstin: { $exists: true, $ne: null } });

  let res = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookie() } }); setCookies(res);
  const { csrfToken } = await res.json();
  res = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() }, body: new URLSearchParams({ csrfToken, email: "demo@billeasy.test", password: "demo123", callbackUrl: `${BASE}/dashboard` }), redirect: "manual" }); setCookies(res);
  console.log("login:", [...jar.keys()].some((k) => k.includes("session-token")) ? "✓" : "FAIL");

  // Big invoice (10 * 10000 = 100000 taxable, well above 50k)
  res = await fetch(`${BASE}/api/invoices`, { method: "POST", headers: j(), body: JSON.stringify({ customerId: customer._id.toString(), status: "finalized", lines: [{ description: "Bulk Machine", hsnSac: "8479", qty: 10, unit: "pcs", rateRupees: 10000, gstRate: 18 }] }) });
  const big = (await res.json()).invoice;
  console.log("big invoice:", big.invoiceNo, "total(paise):", big.grandTotalPaise, "(>50k:", big.grandTotalPaise > 5000000, ")");

  // Generate EWB
  res = await fetch(`${BASE}/api/ewaybill/generate`, { method: "POST", headers: j(), body: JSON.stringify({ invoiceId: big.id, mode: "1", vehicleNo: "TN01AB1234", distanceKm: 350 }) });
  const ewb = await res.json();
  console.log("ewb generate:", res.status, "| ewbNo:", ewb.ewbNo, "| len:", ewb.ewbNo?.length, "| validUpto:", ewb.validUptoStr);
  console.log("  distance 350km -> 2 days validity expected; payload transDistance:", ewb.payload?.transDistance);

  // Verify persisted
  const doc = await db.collection("invoices").findOne({ _id: new mongoose.Types.ObjectId(big.id) });
  console.log("  persisted on invoice:", doc.ewaybill?.ewbNo === ewb.ewbNo, "| has validUpto:", !!doc.ewaybill?.validUpto);

  // Verify shows on preview
  res = await fetch(`${BASE}/invoice/preview?id=${big.id}`, { headers: { cookie: cookie() } });
  const html = await res.text();
  console.log("  preview shows EWB no:", html.includes(ewb.ewbNo));

  // Threshold guard: small invoice (<50k) should be rejected
  res = await fetch(`${BASE}/api/invoices`, { method: "POST", headers: j(), body: JSON.stringify({ customerId: customer._id.toString(), status: "finalized", lines: [{ description: "Small thing", hsnSac: "1111", qty: 1, unit: "pcs", rateRupees: 500, gstRate: 18 }] }) });
  const small = (await res.json()).invoice;
  res = await fetch(`${BASE}/api/ewaybill/generate`, { method: "POST", headers: j(), body: JSON.stringify({ invoiceId: small.id, mode: "1", distanceKm: 10 }) });
  console.log("small invoice EWB -> rejected 422:", res.status === 422);

  await mongoose.disconnect();
  console.log("\nDONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
