# BillEasy — GST Billing SaaS · Project Plan & Specification

**Status:** Planning · **Date:** 2026-05-29 · **Owner:** selva@stallioni.com

---

## 1. Executive Summary

**BillEasy** is a cloud GST billing & compliance SaaS for Indian small businesses and traders.
Core promise: *create a legally-compliant GST invoice in under 30 seconds, file your returns, and get e-invoice IRN automatically.*

**Target segment (CONFIRMED — e-invoice-first):** ₹2cr–₹10cr turnover SMEs newly mandated into
GST e-invoicing (IRN/QR) by the Oct 1, 2025 threshold drop. Billing/customers/items/GSTR are the
supporting "it does everything too" cast — **e-invoice compliance is the headline pitch.**

> **Positioning (the whole strategy):** Don't sell "another billing app" to all traders — that's an
> unwinnable war vs Vyapar (1cr+ users) and free Zoho. Instead, be **the obvious answer to a scary
> new legal requirement** for a specific, searchable, already-paying audience. Same product, sharper
> target. Headline: *"Get GST e-invoices (IRN + QR) in 1 click — stay compliant with the new ₹2cr rule."*
> General traders are a **later expansion** once brand credibility is earned. See §7.

---

## 2. Market Analysis (May 2026 research)

### Competitive landscape

| Competitor | Reach | Price | Strength | Weakness we exploit |
|---|---|---|---|---|
| Vyapar | 1cr+ users | ~₹1,499/yr | Offline-first, mobile, traders | Weaker cloud/multi-device, dated UX |
| myBillBook | Millions | ~₹458–999/yr | Mobile-first, WhatsApp billing | Limited reporting depth |
| Zoho Invoice/Books | Huge | Free ≤50 cust. | Ecosystem, automation | Overkill/complex for small traders |
| Swipe | Growing | Free + ₹212–250/mo | 10-sec invoices, e-invoice, e-way bill | Newer brand, less trust |
| Refrens | 150k+ | Free + paid | Freelancers, multi-currency | Not built for traders/inventory |
| TallyPrime / ClearTax / Marg | Leaders | High | Accountant/enterprise depth | Expensive, steep learning curve |

### Key market facts driving the opportunity
- **~70% of Indian small businesses still do GST manually.** Large untapped base.
- **E-invoicing threshold dropped to ₹2 crore turnover (Oct 1, 2025)** — millions of SMEs newly forced into mandatory IRN generation, with a ~3-day reporting window. This is the single biggest tailwind.
- Penalties: 100% of tax due or ₹10,000/invoice (whichever higher) for non-issuance; up to ₹25,000 for incorrect invoicing. → compliance fear drives adoption.

### Implications for BillEasy
1. **Free/cheap is the table-stakes price anchor.** A ₹499/mo entry tier is uncompetitive (see §8 — pricing revised to annual).
2. **E-invoice (IRN/QR) is no longer optional for a 2026 product** — design it in now (decision confirmed).
3. **WhatsApp delivery and mobile responsiveness are expected, not premium.**

---

## 3. Tech Stack (confirmed)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | SSR + API routes in one codebase |
| Database | **MongoDB Atlas + Mongoose** | Per spec. See §4.1 caveats for financial-data discipline |
| Auth | NextAuth.js v5 (Google + credentials) | Business profile created post-signup |
| UI | Tailwind CSS + shadcn/ui | Mobile-responsive mandatory |
| PDF | @react-pdf/renderer | Legal GST tax-invoice layout |
| Billing | Razorpay Subscriptions (₹ INR) | 14-day trial |
| Email | Resend | Invoice + system email |
| WhatsApp | Interakt API | ₹999/mo flat, Indian provider |
| File storage | Cloudinary | PDF hosting for WhatsApp links |
| E-invoice | GSP API (ClearTax / Masters India / GSTZen) | IRN + signed QR. Stub first, integrate later |
| Hosting | Vercel | Serverless; mind cold starts on PDF routes |

### MongoDB financial-data caveats (important)
Mongo is fine, but accounting data needs discipline Mongo won't enforce for you:
- **Store all money as integer paise** (never floats). Add a runtime guard.
- **Never delete or hard-edit a finalized invoice** — issue credit/debit notes instead (GST law requirement). Use `status` + immutable `finalizedAt`.
- **Invoice numbering must be atomic** — use a `Counter` collection with `findOneAndUpdate($inc)` to avoid duplicate invoice numbers under concurrency. (A naive count+1 will collide.)
- Run GSTR aggregations via the **aggregation pipeline**, not in-app loops.

---

## 4. Data Model (MongoDB / Mongoose)

### 4.1 Collections

**Business** (the tenant)
```
_id, ownerUserId, name, gstin, stateCode, address{line1,line2,city,pincode},
phone, email, logoUrl, bankDetails{accountName,accountNumber,ifsc,bankName},
financialYear (e.g. "2024-25"), plan, planExpiry, trialEndsAt,
eInvoiceEnabled, gspCredentials(ref/encrypted), createdAt
```

**User** (NextAuth) — `_id, name, email, passwordHash?, provider, businessIds[], role`

**Customer** — `_id, businessId, name, gstin?, stateCode, address{}, phone, email, outstandingPaise, createdAt`

**Item** — `_id, businessId, name, hsnSac, unit, defaultRatePaise, gstRate, cessRate?, createdAt`

**Invoice** (core)
```
_id, businessId, invoiceNo (e.g. INV-2425-0001), invoiceDate, dueDate,
customerId, customerSnapshot{} (denormalized — never changes after finalize),
placeOfSupplyStateCode, taxType ("intrastate"|"interstate"|"b2c"),
lineItems[ { itemId?, description, hsnSac, qty, unit, ratePaise, gstRate, cessRate,
            taxablePaise, cgstPaise, sgstPaise, igstPaise, cessPaise, totalPaise } ],
subtotalPaise, totalCgstPaise, totalSgstPaise, totalIgstPaise, totalCessPaise,
roundOffPaise, grandTotalPaise, amountInWords,
status ("draft"|"finalized"|"sent"|"paid"|"cancelled"),
paymentTerms, notes,
einvoice{ irn?, ackNo?, ackDate?, signedQrCode?, status }, // designed-in
ewaybill{ ewbNo?, validUpto? },
whatsappSentAt?, paymentLinkUrl?, razorpayPaymentId?,
finalizedAt?, createdAt
```

**CreditNote / DebitNote** — mirror of Invoice with `originalInvoiceId`, `reason`. (Needed for GSTR-1 `cdnr`.)

**Counter** — `_id (e.g. "<businessId>:2024-25"), seq` → atomic invoice numbering.

**Subscription** — `_id, businessId, razorpaySubscriptionId, plan, status, currentPeriodEnd, payments[]`

### 4.2 Indexes
- `Invoice`: `{businessId:1, invoiceDate:-1}`, `{businessId:1, invoiceNo:1}` (unique), `{businessId:1, status:1}`
- `Customer`/`Item`: `{businessId:1, name:1}` (text index for search)
- Multi-tenancy: **every query filters by `businessId`** — enforce in a shared data-access helper.

---

## 5. GST Engine (`lib/gst-calculator.ts`) — the crown jewel

This is where correctness matters most. Build it pure, deterministic, fully unit-tested.

### Functions
- `determineTaxType(sellerState, buyerState, buyerGSTIN)` → `intrastate | interstate | b2c`
  - No buyer GSTIN → **b2c** (always CGST+SGST).
  - Has GSTIN + same state → intrastate (CGST+SGST).
  - Has GSTIN + different state → interstate (IGST).
- `calculateLineItem(qtyMilli, ratePaise, gstRate, taxType)` → `{taxablePaise, cgst, sgst, igst, totalPaise}`
  - All integer paise. **Round each line-item tax** (GST rule), not the total.
  - Split rule: intrastate/b2c → cgst=sgst=round(tax/2); interstate → igst=tax.
- `calculateInvoice(items[], sellerState, buyerState, buyerGSTIN)` → full totals + `roundOffPaise` (to nearest rupee) + `amountInWords`.
- `amountInWords(paise)` → Indian system: "Rupees Five Lakh Twenty Thousand Only" (lakh/crore, not million).
- `validateGSTIN(gstin)` → `{valid, stateCode, panNumber}` with **checksum digit validation** (offline; no API needed).
- Constants: `GST_RATES = [0,5,12,18,28]`, `INDIAN_STATE_CODES` (all 37 states/UTs with code+name).

### Test cases (must pass before anything else ships)
- Intrastate 18% → cgst=sgst=9%.
- Interstate 18% → igst=18%, cgst=sgst=0.
- B2C across states → still cgst+sgst.
- Rounding: line tax 0.5 paise behavior; grand-total round-off.
- `amountInWords`: 520000 paise → "Rupees Five Thousand Two Hundred Only"; 1,20,00,000 → crore wording.
- `validateGSTIN`: valid sample, wrong checksum, wrong length, invalid state code.

---

## 6. Feature Modules & Build Phases

### Phase 1 — Foundation (build first)
- `lib/mongodb.ts` connection singleton (cached across hot-reloads/serverless).
- All Mongoose models (§4) with TypeScript interfaces.
- `lib/gst-calculator.ts` + full test suite.
- `app/api/gst/calculate` route.

### Phase 2 — Auth & business profile
- NextAuth v5 (Google + credentials). Register/login pages.
- Post-signup: create Business with GSTIN validation + state code.

### Phase 3 — Masters
- Customer master (search, inline add, GSTIN format validation → auto state code).
- Item master (HSN/SAC, unit, default rate, GST rate).
- API routes: `customers`, `items`.

### Phase 4 — Invoicing
- Invoice builder page (real-time calc via React state + `/api/gst/calculate`).
- Atomic invoice numbering (Counter).
- PDF (`components/InvoicePDF/GSTInvoice.tsx`) + `/api/pdf` download route.
- Save Draft / Finalize / Preview.

### Phase 5 — E-invoice (THE PRODUCT — moved up, this is the pitch)
- GSP adapter interface (`lib/einvoice/gsp.ts`) — pluggable; stub returns mock IRN in dev, one real GSP (ClearTax/Masters India) in prod.
- Generate IRN + signed QR on invoice finalize (for businesses with `eInvoiceEnabled`).
- Store `einvoice{}` on Invoice; render QR on PDF.
- One-click "Generate E-Invoice" UX as the hero action.
- (Later) E-way bill generation.

### Phase 6 — Compliance & delivery
- GSTR-1 export (b2b / b2cl / b2cs / cdnr) JSON + Excel (exceljs).
- GSTR-3B summary.
- WhatsApp send (Interakt + Cloudinary).
- Razorpay payment links + webhook.

### Phase 7 — SaaS layer
- Dashboard (sales, GST collected, unpaid, recent activity).
- Razorpay subscriptions + plan enforcement middleware.
- Settings: profile, bank, plan/usage, billing history.

---

## 7. Positioning & Differentiation (e-invoice-first — CONFIRMED)

**Beachhead:** ₹2cr–₹10cr SMEs hit by the Oct 1, 2025 e-invoice mandate. Why this wins:
- **Time-boxed legal panic** — they *just* became required to generate IRN/QR; penalty is 100% of tax or ₹10,000/invoice. Fear-driven, urgent buying.
- **Already pay for software** — no "but Vyapar is free" objection at this turnover.
- **Searchable & targetable** — "e-invoice software", "IRN generation", "GST e-invoice ₹2 crore". Cheap, ownable SEO/ad niche vs the horizontal billing war.

**Messaging:**
- ❌ "BillEasy — GST billing for your business"
- ✅ "BillEasy — Get GST e-invoices (IRN + QR) in 1 click. Stay compliant with the new ₹2cr rule."

**Supporting features** (the "and it does everything else too"): billing, customers, items, GSTR export, WhatsApp delivery, payment links.

**Build implication:** the **e-invoice GSP integration moves EARLIER** (right after invoice+PDF) — it's the product, not a Phase 6 add-on. See §6 revised order.

**Fallback / expansion:** if the niche saturates, expand *down* into general traders later with brand credibility already earned — same codebase.

**Avoid:** out-featuring Tally on day one. Win on *one-click compliance* + *speed to first invoice*.

---

## 8. Pricing (revised from original ₹499/999/1999/mo)

The original monthly pricing is uncompetitive vs Vyapar (~₹1,499/yr) and free tiers. **Recommended:**

| Plan | Price | Limits | For |
|---|---|---|---|
| **Free** | ₹0 | 20 invoices/mo, 1 user, BillEasy branding | Acquisition / trust building |
| **Starter** | **₹1,499/yr** (~₹125/mo) | Unlimited invoices, 1 user, WhatsApp, PDF, GSTR export | Solo traders |
| **Professional** | **₹2,999/yr** | + 3 users, e-invoice IRN, e-way bill, remove branding | Growing SMBs (₹2cr+ e-invoice need) |
| **Business** | **₹5,999/yr** | + 10 users, multi-branch, CA access, priority support | Multi-location |

- Keep **14-day trial** of Professional on signup.
- Bill annually (matches market norm + better cash flow + lower churn). Offer monthly at a premium if needed.
- Razorpay Subscriptions for recurring; ₹ in paise.

> Decision needed from you: confirm annual vs your original monthly model. (See Open Questions §11.)

---

## 9. Environment Variables (`.env.local` template)

```
# Database
MONGODB_URI=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Razorpay (payments + subscriptions)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_STARTER=
RAZORPAY_PLAN_PRO=
RAZORPAY_PLAN_BUSINESS=

# WhatsApp (Interakt)
INTERAKT_API_KEY=

# File storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Resend)
RESEND_API_KEY=

# E-invoice GSP (e.g. ClearTax / Masters India) — stub in dev
GSP_BASE_URL=
GSP_API_KEY=
GSP_API_SECRET=
EINVOICE_MODE=stub   # stub | live
```

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Crowded market, hard to acquire users | High | Lead with e-invoice + WhatsApp wedge; free tier; content/SEO on "e-invoice for ₹2cr businesses" |
| GST calculation/rounding bugs | High | Pure functions + exhaustive unit tests before UI |
| Duplicate invoice numbers under load | Med | Atomic Counter collection |
| Float money errors | High | Integer paise everywhere + guard |
| GSP API cost/complexity for e-invoice | Med | Adapter pattern + stub; only enable for paid users |
| Vercel serverless cold start on PDF | Low | Keep PDF route lean; consider edge/runtime tuning |
| Legal invoice format wrong | High | Follow GST mandatory fields checklist; CA review before launch |
| Data security (financial PII) | High | Encrypt GSP creds; per-tenant isolation; rate limits; audit log |

---

## 11. Open Questions for You

1. **Pricing:** Adopt the revised **annual** model (§8) or keep your original ₹499/999/1999 **monthly**?
2. **Which GSP** for e-invoice? (ClearTax, Masters India, GSTZen — affects integration code.) Stub is fine to start.
3. **Free tier yes/no?** Strongly recommended for acquisition in this segment.
4. **Offline mode** — out of scope for v1 (cloud-only). Acceptable, or is offline a must vs Vyapar?
5. **Brand name** — is "BillEasy" final? (Check trademark + domain availability.)

---

## 12. Recommended Immediate Next Step

Build **Phase 1** first — it's the foundation everything else depends on and the highest-risk-if-wrong:
1. `lib/mongodb.ts`
2. All 4+ Mongoose models with TS interfaces
3. `lib/gst-calculator.ts` **with the full test suite**
4. `app/api/gst/calculate/route.ts`

Once the GST engine is proven correct, the rest is conventional CRUD + UI.

---
*This plan supersedes the original prompt set's pricing and adds e-invoice as a first-class, designed-in feature.*
