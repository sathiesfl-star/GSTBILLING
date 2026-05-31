// E2E (mock mode): login -> subscribe to Pro -> verify plan/trial/eInvoice -> cancel -> back to free.
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
  const biz = () => db.collection("businesses").findOne({});

  // Reset to free first so the test is deterministic
  const b0 = await biz();
  await db.collection("businesses").updateOne({ _id: b0._id }, { $set: { plan: "free" }, $unset: { planStatus: "", trialEndsAt: "", planExpiry: "" } });

  let res = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookie() } }); setCookies(res);
  const { csrfToken } = await res.json();
  res = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() }, body: new URLSearchParams({ csrfToken, email: "demo@billeasy.test", password: "demo123", callbackUrl: `${BASE}/dashboard` }), redirect: "manual" }); setCookies(res);
  console.log("login:", [...jar.keys()].some((k) => k.includes("session-token")) ? "✓" : "FAIL");

  // Subscribe to Pro
  res = await fetch(`${BASE}/api/billing/subscribe`, { method: "POST", headers: j(), body: JSON.stringify({ tier: "pro" }) });
  const sub = await res.json();
  console.log("subscribe pro:", res.status, "| mode:", sub.mode, "| trialDays:", sub.trialDays);

  let b = await biz();
  const trialOk = b.trialEndsAt && (new Date(b.trialEndsAt) - new Date()) > 13 * 86400000;
  console.log("  plan=pro:", b.plan === "pro", "| status:", b.planStatus, "| 14d trial:", !!trialOk, "| eInvoiceEnabled:", b.eInvoiceEnabled);

  // Settings page shows Professional + trial
  res = await fetch(`${BASE}/settings`, { headers: { cookie: cookie() } });
  const html = await res.text();
  console.log("  settings shows Professional:", html.includes("Professional"), "| shows Trial:", html.includes("Trial"));

  // Unknown tier rejected
  res = await fetch(`${BASE}/api/billing/subscribe`, { method: "POST", headers: j(), body: JSON.stringify({ tier: "platinum" }) });
  console.log("unknown tier -> 422:", res.status === 422);

  // Cancel (mock -> back to free)
  res = await fetch(`${BASE}/api/billing/cancel`, { method: "POST", headers: j() });
  const cancel = await res.json();
  console.log("cancel:", res.status, "| mode:", cancel.mode);
  b = await biz();
  console.log("  plan back to free:", b.plan === "free", "| eInvoiceEnabled off:", b.eInvoiceEnabled === false);

  await mongoose.disconnect();
  console.log("\nDONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
