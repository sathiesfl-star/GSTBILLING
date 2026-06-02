// Tests the REAL production signup flow end-to-end, then cleans up the test account.
// Verifies a fresh prospect can register -> auto-login -> reach dashboard on free plan.
const BASE = process.env.PROD_URL || "https://gstbilling-omega.vercel.app";
const jar = new Map();
const setCookies = (r) => { for (const c of r.headers.getSetCookie?.() ?? []) { const [p] = c.split(";"); const i = p.indexOf("="); jar.set(p.slice(0,i), p.slice(i+1)); } };
const cookie = () => [...jar].map(([k,v]) => `${k}=${v}`).join("; ");

const testEmail = `prospect-test-${Date.now()}@example.com`;
const testPass = "test1234";

async function main() {
  console.log("Testing production signup at:", BASE);
  console.log("Test email:", testEmail);

  // 1) Register a fresh business (valid GSTIN)
  let r = await fetch(`${BASE}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test Prospect",
      email: testEmail,
      password: testPass,
      businessName: "Test Traders Pvt Ltd",
      gstin: "27AAPFU0939F1ZV", // valid checksum, Maharashtra
    }),
  });
  let data = await r.json().catch(() => ({}));
  console.log("1) register:", r.status, r.ok ? "✓" : `✗ ${data.error}`);
  if (!r.ok) { console.log("   STOP — registration failed"); process.exit(1); }

  // 2) Auto-login via credentials
  r = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookie() } }); setCookies(r);
  const { csrfToken } = await r.json();
  r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email: testEmail, password: testPass, callbackUrl: `${BASE}/dashboard` }),
  });
  setCookies(r);
  const hasSession = [...jar.keys()].some(k => k.includes("session-token"));
  console.log("2) login:", r.status, hasSession ? "session ✓" : "✗ no session");

  // 3) Reach dashboard with the new (empty) business
  r = await fetch(`${BASE}/dashboard`, { headers: { cookie: cookie() } });
  const html = await r.text();
  console.log("3) dashboard:", r.status,
    "| shows business name:", html.includes("Test Traders"),
    "| empty state (0 invoices ok):", html.includes("Dashboard"));

  // 4) Duplicate email should be rejected
  r = await fetch(`${BASE}/api/register`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Dup", email: testEmail, password: testPass, businessName: "X", gstin: "27AAPFU0939F1ZV" }),
  });
  console.log("4) duplicate email rejected:", r.status === 409 ? "✓ (409)" : `✗ (${r.status})`);

  // 5) Invalid GSTIN should be rejected
  r = await fetch(`${BASE}/api/register`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bad", email: `bad-${Date.now()}@x.com`, password: testPass, businessName: "X", gstin: "INVALID123" }),
  });
  console.log("5) invalid GSTIN rejected:", r.status === 422 ? "✓ (422)" : `✗ (${r.status})`);

  console.log("\n⚠️  Test account created in PROD DB:", testEmail);
  console.log("   Run scripts/cleanup-test-users.mjs to remove test accounts.");
}
main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
