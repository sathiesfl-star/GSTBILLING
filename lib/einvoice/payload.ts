/**
 * Builds the real NIC e-invoice JSON payload (schema Version 1.1) from invoice data.
 * Field names and structure follow the NIC "Generate IRN" schema:
 * Version, TranDtls, DocDtls, SellerDtls, BuyerDtls, ItemList, ValDtls.
 *
 * All monetary values in the NIC schema are in RUPEES with 2 decimals (not paise).
 */

import type { InvoiceTotals } from "@/lib/gst-calculator";
import type { DocType, QrPayload } from "./irn";

export interface Party {
  gstin?: string; // undefined => unregistered (B2C / "URP")
  legalName: string;
  address: string;
  city: string;
  pincode: string;
  stateCode: string;
  phone?: string;
  email?: string;
}

export interface EInvoiceInput {
  docType: DocType;
  docNo: string;
  docDate: string; // dd/mm/yyyy
  seller: Party;
  buyer: Party;
  totals: InvoiceTotals;
}

const rupees = (paise: number): number => Number((paise / 100).toFixed(2));

/** Build the NIC v1.1 payload. */
export function buildEInvoicePayload(input: EInvoiceInput) {
  const { seller, buyer, totals } = input;
  const isB2B = !!buyer.gstin;

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: isB2B ? "B2B" : "B2C",
      RegRev: "N",
      IgstOnIntra: "N",
    },
    DocDtls: {
      Typ: input.docType,
      No: input.docNo,
      Dt: input.docDate, // dd/mm/yyyy
    },
    SellerDtls: {
      Gstin: seller.gstin,
      LglNm: seller.legalName,
      Addr1: seller.address,
      Loc: seller.city,
      Pin: Number(seller.pincode),
      Stcd: seller.stateCode,
      Ph: seller.phone?.replace(/\D/g, "").slice(-10),
      Em: seller.email,
    },
    BuyerDtls: {
      Gstin: buyer.gstin ?? "URP", // URP = Unregistered Person
      LglNm: buyer.legalName,
      Pos: buyer.stateCode, // place of supply
      Addr1: buyer.address,
      Loc: buyer.city,
      Pin: Number(buyer.pincode),
      Stcd: buyer.stateCode,
    },
    ItemList: totals.lines.map((l, i) => ({
      SlNo: String(i + 1),
      PrdDesc: l.description,
      IsServc: l.unit === "hr" ? "Y" : "N",
      HsnCd: l.hsnSac,
      Qty: l.qty,
      Unit: l.unit.toUpperCase(),
      UnitPrice: rupees(l.ratePaise),
      TotAmt: rupees(l.taxablePaise),
      AssAmt: rupees(l.taxablePaise),
      GstRt: l.gstRate,
      IgstAmt: rupees(l.igstPaise),
      CgstAmt: rupees(l.cgstPaise),
      SgstAmt: rupees(l.sgstPaise),
      CesRt: 0,
      CesAmt: 0,
      TotItemVal: rupees(l.totalPaise),
    })),
    ValDtls: {
      AssVal: rupees(totals.subtotalPaise),
      CgstVal: rupees(totals.totalCgstPaise),
      SgstVal: rupees(totals.totalSgstPaise),
      IgstVal: rupees(totals.totalIgstPaise),
      CesVal: 0,
      Discount: 0,
      OthChrg: 0,
      RndOffAmt: rupees(totals.roundOffPaise),
      TotInvVal: rupees(totals.grandTotalPaise),
    },
  };
}

/** Pick the "main" HSN — the line with the highest taxable value (NIC convention for the QR). */
export function mainHsnCode(totals: InvoiceTotals): string {
  let best = totals.lines[0];
  for (const l of totals.lines) if (l.taxablePaise > best.taxablePaise) best = l;
  return best?.hsnSac ?? "";
}

/** Build the QR payload (the content the IRP signs into the QR). */
export function buildQrPayload(
  input: EInvoiceInput,
  irn: string,
  irnDt: string
): QrPayload {
  return {
    SellerGstin: input.seller.gstin ?? "",
    BuyerGstin: input.buyer.gstin ?? "URP",
    DocNo: input.docNo,
    DocTyp: input.docType,
    DocDt: input.docDate,
    TotInvVal: rupees(input.totals.grandTotalPaise),
    ItemCnt: input.totals.lines.length,
    MainHsnCode: mainHsnCode(input.totals),
    Irn: irn,
    IrnDt: irnDt,
  };
}
