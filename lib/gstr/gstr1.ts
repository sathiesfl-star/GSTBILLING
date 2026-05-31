/**
 * GSTR-1 and GSTR-3B generators in the GSTN portal JSON format.
 * PURE functions over a generic invoice shape — no DB import. The caller (lib/data.ts)
 * fetches invoices for a business+period and passes them in.
 *
 * Classification per GSTR-1 spec:
 *   - b2b   : buyer has a GSTIN (grouped by counterparty GSTIN "ctin")
 *   - b2cl  : no GSTIN + interstate + invoice value > ₹2,50,000 (large)
 *   - b2cs  : remaining B2C, summarised by place-of-supply + rate
 *   - cdnr  : credit/debit notes against registered buyers (none yet)
 * Amounts are in rupees with 2 decimals. Tax fields are rate-wise within each invoice.
 */

const B2CL_THRESHOLD_PAISE = 250000_00; // ₹2,50,000

const rupees = (paise: number): number => Number((paise / 100).toFixed(2));

/** "YYYY-MM-DD" -> "DD-MM-YYYY" (GSTN date format). */
function gstnDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** "YYYY-MM-DD" -> filing period "MMYYYY". */
export function filingPeriod(iso: string): string {
  const [y, m] = iso.split("-");
  return `${m}${y}`;
}

export interface GstrLine {
  gstRate: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export interface GstrInvoice {
  invoiceNo: string;
  isoDate: string; // YYYY-MM-DD
  grandTotalPaise: number;
  subtotalPaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  totalTaxPaise: number;
  buyerGstin?: string;
  buyerStateCode: string;
  lines: GstrLine[];
}

export interface Seller {
  gstin: string;
  stateCode: string;
}

interface RateGroup {
  rt: number;
  txval: number; // paise
  iamt: number;
  camt: number;
  samt: number;
}

function rateWise(inv: GstrInvoice): RateGroup[] {
  const map = new Map<number, RateGroup>();
  for (const l of inv.lines) {
    const g = map.get(l.gstRate) ?? { rt: l.gstRate, txval: 0, iamt: 0, camt: 0, samt: 0 };
    g.txval += l.taxablePaise;
    g.iamt += l.igstPaise;
    g.camt += l.cgstPaise;
    g.samt += l.sgstPaise;
    map.set(l.gstRate, g);
  }
  return [...map.values()].sort((a, b) => a.rt - b.rt);
}

// ---------------------------------------------------------------------------
// GSTR-1
// ---------------------------------------------------------------------------

export function buildGstr1(invoices: GstrInvoice[], seller: Seller, period: string) {
  // ---- B2B (grouped by counterparty GSTIN) ----
  const b2bMap = new Map<string, any[]>();
  for (const inv of invoices) {
    if (!inv.buyerGstin) continue;
    const invObj = {
      inum: inv.invoiceNo,
      idt: gstnDate(inv.isoDate),
      val: rupees(inv.grandTotalPaise),
      pos: inv.buyerStateCode,
      rchrg: "N",
      inv_typ: "R",
      itms: rateWise(inv).map((g, i) => ({
        num: i + 1,
        itm_det: { rt: g.rt, txval: rupees(g.txval), iamt: rupees(g.iamt), camt: rupees(g.camt), samt: rupees(g.samt), csamt: 0 },
      })),
    };
    const arr = b2bMap.get(inv.buyerGstin) ?? [];
    arr.push(invObj);
    b2bMap.set(inv.buyerGstin, arr);
  }
  const b2b = [...b2bMap.entries()].map(([ctin, inv]) => ({ ctin, inv }));

  // ---- B2C Large + B2C Small ----
  const b2cl: any[] = [];
  const b2csMap = new Map<string, any>();
  for (const inv of invoices) {
    if (inv.buyerGstin) continue; // B2C only
    const interstate = inv.buyerStateCode !== seller.stateCode;
    const pos = inv.buyerStateCode;

    if (interstate && inv.grandTotalPaise > B2CL_THRESHOLD_PAISE) {
      b2cl.push({
        pos,
        inv: [
          {
            inum: inv.invoiceNo,
            idt: gstnDate(inv.isoDate),
            val: rupees(inv.grandTotalPaise),
            itms: rateWise(inv).map((g, i) => ({
              num: i + 1,
              itm_det: { rt: g.rt, txval: rupees(g.txval), iamt: rupees(g.iamt), csamt: 0 },
            })),
          },
        ],
      });
    } else {
      for (const g of rateWise(inv)) {
        const sply_ty = interstate ? "INTER" : "INTRA";
        const key = `${sply_ty}|${pos}|${g.rt}`;
        const rec = b2csMap.get(key) ?? { sply_ty, pos, typ: "OE", rt: g.rt, _txvalP: 0, _iamtP: 0, _camtP: 0, _samtP: 0 };
        rec._txvalP += g.txval;
        rec._iamtP += g.iamt;
        rec._camtP += g.camt;
        rec._samtP += g.samt;
        b2csMap.set(key, rec);
      }
    }
  }
  const b2cs = [...b2csMap.values()].map((r) => ({
    sply_ty: r.sply_ty,
    pos: r.pos,
    typ: r.typ,
    rt: r.rt,
    txval: rupees(r._txvalP),
    iamt: rupees(r._iamtP),
    camt: rupees(r._camtP),
    samt: rupees(r._samtP),
    csamt: 0,
  }));

  return { gstin: seller.gstin, fp: period, version: "GST3.2.2", hash: "hash", b2b, b2cl, b2cs, cdnr: [] };
}

// ---------------------------------------------------------------------------
// GSTR-3B (summary)
// ---------------------------------------------------------------------------

export function buildGstr3b(invoices: GstrInvoice[], seller: Seller, period: string) {
  let txval = 0, iamt = 0, camt = 0, samt = 0;
  for (const inv of invoices) {
    txval += inv.subtotalPaise;
    iamt += inv.totalIgstPaise;
    camt += inv.totalCgstPaise;
    samt += inv.totalSgstPaise;
  }
  return {
    gstin: seller.gstin,
    ret_period: period,
    sup_details: {
      osup_det: { txval: rupees(txval), iamt: rupees(iamt), camt: rupees(camt), samt: rupees(samt), csamt: 0 },
      osup_zero: { txval: 0, iamt: 0, csamt: 0 },
      osup_nil_exmp: { txval: 0 },
    },
  };
}

/** Counts/totals for the on-screen summary. */
export function gstrSummary(invoices: GstrInvoice[], seller: Seller, period: string) {
  const g1 = buildGstr1(invoices, seller, period);
  return {
    invoiceCount: invoices.length,
    b2bInvoices: invoices.filter((i) => i.buyerGstin).length,
    b2cInvoices: invoices.filter((i) => !i.buyerGstin).length,
    b2bParties: g1.b2b.length,
    b2csRecords: g1.b2cs.length,
    totalTaxablePaise: invoices.reduce((s, i) => s + i.subtotalPaise, 0),
    totalTaxPaise: invoices.reduce((s, i) => s + i.totalTaxPaise, 0),
    totalInvoiceValuePaise: invoices.reduce((s, i) => s + i.grandTotalPaise, 0),
  };
}
