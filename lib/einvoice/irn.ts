/**
 * Real IRN (Invoice Reference Number) computation — exactly as the NIC IRP computes it.
 *
 * Per NIC e-invoice spec (https://einv-apisandbox.nic.in/irn.html):
 *   IRN = SHA-256( SupplierGSTIN + FinancialYear + DocType + DocNo )   // NO separators
 *   FinancialYear is "YYYY-YY" derived from the document date (FY starts 1 April).
 *   The result is a 64-char lowercase hex string.
 *
 * Official worked example from NIC:
 *   GSTIN "01AAAAA9999A19N", FY "2019-20", Type "INV", No "ABC01234"
 *   -> input string "01AAAAA9999A19N2019-20INVABC01234"
 *
 * NOTE: the IRN hash is fully reproducible offline (this is real). What CANNOT be produced
 * offline is the IRP's *digital signature* on the QR / signed invoice — that requires the
 * government IRP's private key (obtained via a GSP or the NIC API). See lib/einvoice/gsp.ts.
 */

export type DocType = "INV" | "CRN" | "DBN";

/** Financial year "YYYY-YY" from a document date (FY starts 1 April). */
export function financialYear(date: Date): string {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1; // month 3 == April
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYY}`;
}

/** The exact concatenated string the IRP hashes. Exported for transparency/debugging. */
export function irnHashInput(gstin: string, fy: string, docType: DocType, docNo: string): string {
  return `${gstin}${fy}${docType}${docNo}`;
}

/** SHA-256 hex using Web Crypto — works in both the browser and the Node (route) runtime. */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compute the real IRN for a document. */
export async function computeIrn(
  gstin: string,
  docDate: Date,
  docType: DocType,
  docNo: string
): Promise<string> {
  const fy = financialYear(docDate);
  return sha256Hex(irnHashInput(gstin, fy, docType, docNo));
}

/**
 * The content encoded inside the e-invoice QR code (the fields the IRP signs as a JWS).
 * Source: NIC generate-irn response spec — SignedQRCode payload.
 */
export interface QrPayload {
  SellerGstin: string;
  BuyerGstin: string;
  DocNo: string;
  DocTyp: DocType;
  DocDt: string; // dd/mm/yyyy
  TotInvVal: number;
  ItemCnt: number;
  MainHsnCode: string;
  Irn: string;
  IrnDt: string; // yyyy-MM-dd HH:mm:ss
}
