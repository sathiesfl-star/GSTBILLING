// E2E: login -> create -> edit (PUT) -> delete (DELETE) for customers & items.
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
const j = (cookieStr) => ({ "content-type": "application/json", cookie: cookieStr });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "billeasy" });
  const db = mongoose.connection.db;

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
  console.log("login:", [...jar.keys()].some((k) => k.includes("session-token")) ? "✓" : "FAILED");

  // ---- CUSTOMER ----
  res = await fetch(`${BASE}/api/customers`, { method: "POST", headers: j(cookie()), body: JSON.stringify({ name: "CRUD Test Co", stateCode: "29", gstin: "", phone: "111" }) });
  let d = await res.json();
  const custId = d.customer?.id;
  console.log("customer create:", res.status, custId ? "✓" : d);

  res = await fetch(`${BASE}/api/customers/${custId}`, { method: "PUT", headers: j(cookie()), body: JSON.stringify({ name: "CRUD Test Co (edited)", stateCode: "27", phone: "222" }) });
  console.log("customer edit:", res.status, (await res.json()).ok ? "✓" : "FAIL");
  let cdoc = await db.collection("customers").findOne({ _id: new mongoose.Types.ObjectId(custId) });
  console.log("  DB reflects edit:", cdoc.name === "CRUD Test Co (edited)" && cdoc.stateCode === "27");

  res = await fetch(`${BASE}/api/customers/${custId}`, { method: "DELETE", headers: j(cookie()) });
  console.log("customer delete:", res.status, (await res.json()).ok ? "✓" : "FAIL");
  cdoc = await db.collection("customers").findOne({ _id: new mongoose.Types.ObjectId(custId) });
  console.log("  gone from DB:", cdoc === null);

  // ---- ITEM ----
  res = await fetch(`${BASE}/api/items`, { method: "POST", headers: j(cookie()), body: JSON.stringify({ name: "CRUD Widget", hsnSac: "1234", unit: "pcs", defaultRateRupees: 100, gstRate: 18 }) });
  d = await res.json();
  const itemId = d.item?.id;
  console.log("item create:", res.status, itemId ? "✓" : d);

  res = await fetch(`${BASE}/api/items/${itemId}`, { method: "PUT", headers: j(cookie()), body: JSON.stringify({ name: "CRUD Widget v2", hsnSac: "5678", unit: "box", defaultRateRupees: 250, gstRate: 12 }) });
  console.log("item edit:", res.status, (await res.json()).ok ? "✓" : "FAIL");
  let idoc = await db.collection("items").findOne({ _id: new mongoose.Types.ObjectId(itemId) });
  console.log("  DB reflects edit:", idoc.name === "CRUD Widget v2" && idoc.defaultRatePaise === 25000 && idoc.gstRate === 12);

  res = await fetch(`${BASE}/api/items/${itemId}`, { method: "DELETE", headers: j(cookie()) });
  console.log("item delete:", res.status, (await res.json()).ok ? "✓" : "FAIL");
  idoc = await db.collection("items").findOne({ _id: new mongoose.Types.ObjectId(itemId) });
  console.log("  gone from DB:", idoc === null);

  // ---- cross-tenant guard: delete a non-existent id returns 404 ----
  res = await fetch(`${BASE}/api/items/${new mongoose.Types.ObjectId().toString()}`, { method: "DELETE", headers: j(cookie()) });
  console.log("delete unknown id -> 404:", res.status === 404);

  await mongoose.disconnect();
  console.log("\nDONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
