// End-to-end: login -> create invoice via API -> verify in list + GSTR.
import mongoose from "mongoose";

const BASE = "http://localhost:3000";
const jar = new Map();
const setCookies = (res) => {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
};
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function main() {
  // 0) Find a B2B customer from the DB
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "billeasy" });
  const db = mongoose.connection.db;
  const business = await db.collection("businesses").findOne({});
  const customer = await db.collection("customers").findOne({ businessId: business._id, gstin: { $exists: true, $ne: null } });
  const invoicesBefore = await db.collection("invoices").countDocuments({ businessId: business._id });
  console.log("business:", business.name, "| customer:", customer?.name, "| gstin:", customer?.gstin);
  console.log("invoices before:", invoicesBefore);

  // 1) Login
  let res = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookie() } });
  setCookies(res);
  const { csrfToken } = await res.json();
  res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email: "demo@billeasy.test", password: "demo123", callbackUrl: `${BASE}/dashboard` }),
    redirect: "manual",
  });
  setCookies(res);
  console.log("login:", [...jar.keys()].some((k) => k.includes("session-token")) ? "session ✓" : "FAILED");

  // 2) Create invoice (finalized so it lands in GSTR)
  res = await fetch(`${BASE}/api/invoices`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookie() },
    body: JSON.stringify({
      customerId: customer._id.toString(),
      status: "finalized",
      lines: [
        { description: "E2E Test Widget", hsnSac: "8473", qty: 3, unit: "pcs", rateRupees: 1000, gstRate: 18 },
      ],
    }),
  });
  const created = await res.json();
  console.log("create status:", res.status, "| invoiceNo:", created.invoice?.invoiceNo, "| total(paise):", created.invoice?.grandTotalPaise);
  if (!res.ok) { console.error("CREATE FAILED:", created); process.exit(1); }
  const newNo = created.invoice.invoiceNo;

  // expected: 3*1000 = 3000 taxable, 18% = 540 tax, total 3540 -> 354000 paise
  console.log("  total correct (354000):", created.invoice.grandTotalPaise === 354000);

  // 3) Verify it appears in /invoices HTML
  res = await fetch(`${BASE}/invoices`, { headers: { cookie: cookie() } });
  const html = await res.text();
  console.log("appears in invoices list:", html.includes(newNo));

  // 4) Verify DB count incremented
  const invoicesAfter = await db.collection("invoices").countDocuments({ businessId: business._id });
  console.log("invoices after:", invoicesAfter, "(+", invoicesAfter - invoicesBefore, ")");

  // 5) Verify it flows into GSTR-1 b2b
  res = await fetch(`${BASE}/api/gstr/export`, { headers: { cookie: cookie() } });
  const gstr = await res.json();
  const inB2b = JSON.stringify(gstr.gstr1?.b2b ?? []).includes(newNo);
  console.log("GSTR period:", gstr.period, "| invoice in b2b:", inB2b, "| summary count:", gstr.summary?.invoiceCount);

  await mongoose.disconnect();
  console.log("\nDONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
