// E2E: login -> generate IRN -> create invoice WITH einvoice -> verify IRN persisted
// in DB and rendered on the preview page.
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
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "billeasy" });
  const db = mongoose.connection.db;
  const business = await db.collection("businesses").findOne({});
  const customer = await db.collection("customers").findOne({ businessId: business._id, gstin: { $exists: true, $ne: null } });

  // Login
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

  const lines = [{ description: "Roundtrip Gadget", hsnSac: "8537", qty: 2, unit: "pcs", rateRupees: 5000, gstRate: 18 }];

  // 1) Generate IRN
  res = await fetch(`${BASE}/api/einvoice/generate`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookie() },
    body: JSON.stringify({ customerId: customer._id.toString(), docNo: "PREVIEW", docDate: "31/05/2026", lines }),
  });
  const ei = await res.json();
  console.log("1) IRN generated:", !!ei.irn, "| len:", ei.irn?.length);

  // 2) Create invoice WITH einvoice attached
  res = await fetch(`${BASE}/api/invoices`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookie() },
    body: JSON.stringify({
      customerId: customer._id.toString(),
      status: "finalized",
      lines,
      einvoice: { irn: ei.irn, ackNo: ei.ackNo, ackDt: ei.ackDt, signedQrString: ei.signedQrString },
    }),
  });
  const created = await res.json();
  console.log("2) invoice created:", created.invoice?.invoiceNo, "| status:", res.status);
  const id = created.invoice.id;

  // 3) Verify IRN persisted in DB
  const doc = await db.collection("invoices").findOne({ _id: new mongoose.Types.ObjectId(id) });
  console.log("3) DB einvoice.status:", doc.einvoice?.status, "| irn matches:", doc.einvoice?.irn === ei.irn);

  // 4) Verify preview page renders the IRN
  res = await fetch(`${BASE}/invoice/preview?id=${id}`, { headers: { cookie: cookie() } });
  const html = await res.text();
  console.log("4) preview status:", res.status, "| shows IRN:", html.includes(ei.irn), "| shows TAX INVOICE:", html.includes("TAX INVOICE"));

  await mongoose.disconnect();
  console.log("\nDONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
