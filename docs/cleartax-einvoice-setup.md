# Going live with ClearTax e-invoicing

BillEasy generates a **real IRN hash + NIC v1.1 payload** in `stub` mode already, but the QR
is not government-signed. To get a genuinely **IRP-signed** IRN + QR, connect ClearTax (a GSP).
The adapter is built — you only need credentials and a config switch.

## 1. Get ClearTax sandbox credentials
1. Go to the ClearTax e-invoicing developer site: https://cleartax.in/s/e-invoicing-api
   (or the developer console at https://docs.cleartax.in → "Getting Started").
2. Request **sandbox / API access** for e-invoicing. You'll be onboarded and given:
   - `owner_id`
   - `gsp_app_id`
   - `gsp_app_secret`
   - the **sandbox base URL** for their e-invoicing API
3. Register your test **GSTIN** with them (sandbox uses NIC test GSTINs).

> Our defaults use ClearTax's **documented GSP API** paths:
> - auth: `/einv-gsp/vital/v1.04/auth` (→ `CLEARTAX_AUTH_PATH`)
> - generate IRN: `/einv-gsp/core/v1.03/Invoice` (→ `CLEARTAX_IRN_PATH`)
> - the IRN call sends the token in the `X-CT-Auth-Token` header; the token is valid ~6 hours
>   (the adapter caches it for 5.5h — do not mint one per request).
>
> ClearTax also has a newer "enriched v2" flavour (`/einv/v2/eInvoice/...`). If your console
> gives you that instead, just set `CLEARTAX_AUTH_PATH` / `CLEARTAX_IRN_PATH` to match.
> Request/response payloads follow the NIC schema: https://einv-apisandbox.nic.in/index.html

## 2. Configure `.env.local`
```
EINVOICE_MODE=cleartax
SELLER_GSTIN=<your registered test GSTIN>

CLEARTAX_BASE_URL=<sandbox base url from ClearTax>
CLEARTAX_OWNER_ID=<owner_id>
CLEARTAX_GSP_APP_ID=<gsp_app_id>
CLEARTAX_GSP_APP_SECRET=<gsp_app_secret>
# only if their paths differ from the defaults:
CLEARTAX_AUTH_PATH=
CLEARTAX_IRN_PATH=
```
Leave `EINVOICE_MODE=stub` to keep using the offline mock (default).

## 3. How it works (already implemented)
`lib/einvoice/gsp.ts` → `ClearTaxGspAdapter`:
1. **Auth:** POSTs `owner_id` / `gsp_app_id` / `gsp_app_secret` / `gstin` headers → gets `auth_token` (cached ~50 min).
2. **Generate:** POSTs the NIC v1.1 payload with `x-cleartax-auth-token` → returns the signed
   E-Invoice object (`Irn`, `AckNo`, `AckDt`, `SignedQRCode`).
3. Maps the response into our `EInvoiceResult` (`signed: true`, `mode: "live"`), so the UI badge
   flips from "STUB · not IRP-signed" to "IRP-signed" and the real signed QR renders on the invoice.

No app code changes are needed to switch — it's purely the env vars above.

## 4. Verify after switching
- Create a B2B invoice → "Generate E-Invoice (IRN + QR)". The badge should read **IRP-signed**.
- Scan the QR with the GST/NIC e-invoice verifier app — the signature should validate.
- If you get an auth or path error, re-check `CLEARTAX_AUTH_PATH` / `CLEARTAX_IRN_PATH` against the
  ClearTax docs and the exact auth-response field name (`auth_token`).

## Switching providers later
The same `GspAdapter` interface backs a generic `rest` mode (`EINVOICE_MODE=rest`, `GSP_BASE_URL` +
`GSP_API_KEY`) for Masters India / GSTZen / others — a small adapter change, not an app rewrite.
