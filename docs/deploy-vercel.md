# Deploying BillEasy to Vercel

The code is on GitHub (sathiesfl-star/GSTBILLING). Vercel deploys straight from it.

## ⚠️ Do this FIRST: allow Vercel to reach MongoDB Atlas
Vercel's servers use dynamic IPs, so Atlas must accept connections from anywhere.
1. MongoDB Atlas → your cluster → **Network Access** → **Add IP Address**.
2. Choose **"Allow access from anywhere"** → `0.0.0.0/0` → Confirm.
   (Without this, the deployed app cannot connect and every page 500s.)

## 1. Import the repo
1. Go to https://vercel.com → sign in **with GitHub** (account: sathiesfl-star).
2. **Add New… → Project** → find **GSTBILLING** → **Import**.
3. Framework preset: **Next.js** (auto-detected). Leave build settings default.

## 2. Add Environment Variables (before first deploy)
In the import screen, expand **Environment Variables** and add these
(values from your local `.env.local`, except where noted):

| Name | Value |
|---|---|
| `MONGODB_URI` | (same as local — your Atlas string) |
| `AUTH_SECRET` | `2hcM5sStXcdt0w_xNk_K_a8Ll_zVv_E36Lp_dNQjEM4=` (fresh, generated for prod) |
| `EINVOICE_MODE` | `stub` |
| `SELLER_GSTIN` | `33AAPFU0939F1ZV` |

Leave the rest (Google, GSP, Razorpay) unset for now — the app runs in stub/mock mode.
**Do NOT set `NEXTAUTH_URL` yet** — we set it after we know the deployed URL (step 4).

## 3. Deploy
Click **Deploy**. Wait ~2 min. You'll get a URL like `https://gstbilling-xxxx.vercel.app`.

## 4. Set NEXTAUTH_URL, then redeploy
Auth needs to know its own URL.
1. Project → **Settings → Environment Variables** → add:
   `NEXTAUTH_URL` = your deployed URL (e.g. `https://gstbilling-xxxx.vercel.app`)
2. **Deployments → ⋯ on latest → Redeploy** (so the new var takes effect).

## 5. Seed the production database (one-time)
Your Atlas DB is shared between local and prod, so if you've already run `npm run seed`
locally, the demo data + login (demo@billeasy.test / demo123) already exist in prod too.
If not: run `npm run seed` locally (it writes to the same Atlas DB).

## 6. Verify
- Visit the URL → landing page loads.
- `/login` → demo@billeasy.test / demo123 → dashboard shows data.
- Create an invoice, generate IRN, preview PDF.

## Going live later (when you have credentials)
Add these in Settings → Environment Variables and redeploy:
- **Real e-invoice:** `EINVOICE_MODE=cleartax` + `CLEARTAX_*` (see cleartax-einvoice-setup.md)
- **Real billing:** `RAZORPAY_*` (see razorpay-setup.md) — and set the Razorpay webhook URL to
  `https://<your-vercel-url>/api/billing/webhook`
- **Google login:** `GOOGLE_CLIENT_ID/SECRET` with the Vercel URL as an authorised redirect.

## Auto-deploy
Every `git push` to `main` now auto-deploys. To push future changes:
```
git add -A && git commit -m "..." && git push
```
