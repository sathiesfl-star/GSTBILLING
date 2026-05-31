/**
 * BillEasy — GST calculation engine (pure, deterministic, client-safe).
 *
 * MONEY RULE: all money is integer **paise** internally. Never use floats for money.
 * Display helpers convert to ₹ with 2 decimals only at the edges.
 *
 * GST RULES implemented:
 *  1. INTRASTATE (seller state == buyer state, B2B): tax split CGST + SGST (each = rate/2)
 *  2. INTERSTATE (seller state != buyer state, B2B): full IGST (= rate)
 *  3. B2C (buyer has no GSTIN): treated as CGST + SGST (place-of-supply simplified for prototype)
 *  4. GST rates allowed: 0, 5, 12, 18, 28
 *  5. Tax is rounded PER LINE ITEM (GST rule), not on the grand total.
 */

export type TaxType = "intrastate" | "interstate" | "b2c";

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

/** All 37 Indian states/UTs with their GST state codes. */
export const INDIAN_STATE_CODES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman and Diu" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
];

export function stateName(code: string): string {
  return INDIAN_STATE_CODES.find((s) => s.code === code)?.name ?? "Unknown";
}

// ---------------------------------------------------------------------------
// Tax type
// ---------------------------------------------------------------------------

/**
 * determineTaxType — classify a supply.
 * Tests:
 *   ("27","27","27AAAAA0000A1Z5") -> "intrastate"
 *   ("27","24","24AAAAA0000A1Z5") -> "interstate"
 *   ("27","24", undefined)        -> "b2c"
 */
export function determineTaxType(
  sellerStateCode: string,
  buyerStateCode: string,
  buyerGSTIN?: string | null
): TaxType {
  if (!buyerGSTIN || buyerGSTIN.trim() === "") return "b2c";
  return sellerStateCode === buyerStateCode ? "intrastate" : "interstate";
}

// ---------------------------------------------------------------------------
// Line item
// ---------------------------------------------------------------------------

export interface LineItemResult {
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

/**
 * calculateLineItem — compute tax for a single line.
 * @param qty       quantity (can be fractional, e.g. 2.5 kg)
 * @param ratePaise unit price in paise
 * @param gstRate   one of GST_RATES
 * @param taxType   from determineTaxType
 *
 * Tests:
 *   calculateLineItem(2, 100000, 18, "intrastate")
 *     -> taxable 200000, cgst 18000, sgst 18000, igst 0, total 236000
 *   calculateLineItem(2, 100000, 18, "interstate")
 *     -> taxable 200000, cgst 0, sgst 0, igst 36000, total 236000
 */
export function calculateLineItem(
  qty: number,
  ratePaise: number,
  gstRate: number,
  taxType: TaxType
): LineItemResult {
  const taxablePaise = Math.round(qty * ratePaise);
  const totalTaxPaise = Math.round((taxablePaise * gstRate) / 100);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (taxType === "interstate") {
    igstPaise = totalTaxPaise;
  } else {
    // intrastate or b2c -> split. Give the odd paise to CGST so halves still sum to total.
    cgstPaise = Math.ceil(totalTaxPaise / 2);
    sgstPaise = totalTaxPaise - cgstPaise;
  }

  return {
    taxablePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise: taxablePaise + cgstPaise + sgstPaise + igstPaise,
  };
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export interface InvoiceLineInput {
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  ratePaise: number;
  gstRate: number;
}

export interface InvoiceLineComputed extends InvoiceLineInput, LineItemResult {}

export interface InvoiceTotals {
  taxType: TaxType;
  lines: InvoiceLineComputed[];
  subtotalPaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  totalTaxPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  amountInWords: string;
}

/**
 * calculateInvoice — compute full invoice totals from line inputs.
 * Round-off is applied to the grand total (to nearest rupee), per common practice.
 */
export function calculateInvoice(
  items: InvoiceLineInput[],
  sellerStateCode: string,
  buyerStateCode: string,
  buyerGSTIN?: string | null
): InvoiceTotals {
  const taxType = determineTaxType(sellerStateCode, buyerStateCode, buyerGSTIN);

  const lines: InvoiceLineComputed[] = items.map((it) => ({
    ...it,
    ...calculateLineItem(it.qty, it.ratePaise, it.gstRate, taxType),
  }));

  const subtotalPaise = sum(lines.map((l) => l.taxablePaise));
  const totalCgstPaise = sum(lines.map((l) => l.cgstPaise));
  const totalSgstPaise = sum(lines.map((l) => l.sgstPaise));
  const totalIgstPaise = sum(lines.map((l) => l.igstPaise));
  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise;

  const preRound = subtotalPaise + totalTaxPaise;
  const roundedToRupee = Math.round(preRound / 100) * 100;
  const roundOffPaise = roundedToRupee - preRound;
  const grandTotalPaise = roundedToRupee;

  return {
    taxType,
    lines,
    subtotalPaise,
    totalCgstPaise,
    totalSgstPaise,
    totalIgstPaise,
    totalTaxPaise,
    roundOffPaise,
    grandTotalPaise,
    amountInWords: amountInWords(grandTotalPaise),
  };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Format paise as ₹ with Indian digit grouping, e.g. 234500 -> "₹2,345.00" */
export function formatRupees(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const decimals = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}₹${groupIndian(rupees)}.${decimals}`;
}

/** Indian grouping: 1234567 -> "12,34,567" */
function groupIndian(n: number): string {
  const s = n.toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

// ---------------------------------------------------------------------------
// Amount in words (Indian system: lakh / crore)
// ---------------------------------------------------------------------------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (h) out += ONES[h] + " Hundred";
  if (rest) out += (out ? " " : "") + twoDigits(rest);
  return out;
}

/**
 * amountInWords — Indian numbering.
 * Tests:
 *   amountInWords(520000)   -> "Rupees Five Thousand Two Hundred Only"
 *   amountInWords(12000000) -> "Rupees One Lakh Twenty Thousand Only"
 *   amountInWords(0)        -> "Rupees Zero Only"
 */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  const paiseRem = Math.abs(paise) % 100;

  let words: string;
  if (rupees === 0) {
    words = "Zero";
  } else {
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const hundredsBlock = rupees % 1000;

    const parts: string[] = [];
    if (crore) parts.push(threeDigits(crore) + " Crore");
    if (lakh) parts.push(twoDigits(lakh) + " Lakh");
    if (thousand) parts.push(twoDigits(thousand) + " Thousand");
    if (hundredsBlock) parts.push(threeDigits(hundredsBlock));
    words = parts.join(" ");
  }

  let result = `Rupees ${words}`;
  if (paiseRem) result += ` and ${twoDigits(paiseRem)} Paise`;
  return result + " Only";
}

// ---------------------------------------------------------------------------
// GSTIN validation (offline, format + checksum)
// ---------------------------------------------------------------------------

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface GstinValidation {
  valid: boolean;
  stateCode: string;
  panNumber: string;
  reason?: string;
}

/**
 * validateGSTIN — 15-char format + checksum (the official mod-36 algorithm).
 * Tests:
 *   validateGSTIN("27AAPFU0939F1ZV") -> { valid: true, stateCode: "27", panNumber: "AAPFU0939F" }
 *   validateGSTIN("27AAPFU0939F1ZX") -> { valid: false }  (bad checksum)
 *   validateGSTIN("99AAPFU0939F1ZV") -> { valid: false }  (invalid state code)
 */
export function validateGSTIN(gstin: string): GstinValidation {
  const g = (gstin || "").trim().toUpperCase();
  const stateCode = g.slice(0, 2);
  const panNumber = g.slice(2, 12);

  if (!GSTIN_REGEX.test(g)) {
    return { valid: false, stateCode, panNumber, reason: "Invalid format" };
  }
  if (!INDIAN_STATE_CODES.some((s) => s.code === stateCode)) {
    return { valid: false, stateCode, panNumber, reason: "Invalid state code" };
  }
  if (computeGstinChecksum(g.slice(0, 14)) !== g[14]) {
    return { valid: false, stateCode, panNumber, reason: "Checksum mismatch" };
  }
  return { valid: true, stateCode, panNumber };
}

function computeGstinChecksum(first14: string): string {
  const factor = 36;
  let sum = 0;
  for (let i = 0; i < first14.length; i++) {
    const code = GSTIN_CHARS.indexOf(first14[i]);
    const multiplier = i % 2 === 0 ? 1 : 2;
    const product = code * multiplier;
    sum += Math.floor(product / factor) + (product % factor);
  }
  const remainder = sum % factor;
  const checkCodePoint = (factor - remainder) % factor;
  return GSTIN_CHARS[checkCodePoint];
}
