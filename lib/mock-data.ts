/** Mock data for the prototype. No backend — this stands in for the DB. */

import {
  calculateInvoice,
  type InvoiceLineInput,
  type InvoiceTotals,
  type TaxType,
} from "./gst-calculator";

export const SELLER = {
  name: "Stallioni Trading Co.",
  gstin: "33AAPFU0939F1ZV",
  stateCode: "33", // Tamil Nadu
  address: "12 Anna Salai, Chennai, Tamil Nadu - 600002",
  city: "Chennai",
  pincode: "600002",
  phone: "+91 98400 12345",
  email: "selva@stallioni.com",
  bank: { accountName: "Stallioni Trading Co.", accountNumber: "50100123456789", ifsc: "HDFC0000123", bankName: "HDFC Bank" },
};

export interface MockCustomer {
  id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
}

export const CUSTOMERS: MockCustomer[] = [
  // Intrastate to the seller (Tamil Nadu, 33) -> CGST + SGST
  { id: "c1", name: "Anand Electronics (Tamil Nadu)", gstin: "33AABCA1234M1Z1", stateCode: "33",
    address: "45 Ranganathan St, T Nagar, Chennai - 600017", city: "Chennai", pincode: "600017",
    phone: "+91 90000 11111", email: "accounts@anandelectronics.in" },

  // Interstate B2B (various states) -> IGST
  { id: "c2", name: "Mehta Distributors (Maharashtra)", gstin: "27AAACM5678K1ZZ", stateCode: "27",
    address: "8 MG Road, Andheri, Mumbai - 400069", city: "Mumbai", pincode: "400069",
    phone: "+91 90000 22222", email: "purchase@mehtadist.com" },
  { id: "c4", name: "Kaveri Traders (Karnataka)", gstin: "29AAGCK9012P1ZX", stateCode: "29",
    address: "120 Brigade Rd, Bengaluru - 560001", city: "Bengaluru", pincode: "560001",
    phone: "+91 90000 44444", email: "buy@kaveritraders.in" },
  { id: "c5", name: "Delhi Mega Mart (Delhi)", gstin: "07AADCD3456Q1Z7", stateCode: "07",
    address: "5 Connaught Place, New Delhi - 110001", city: "New Delhi", pincode: "110001",
    phone: "+91 90000 55555", email: "orders@delhimegamart.com" },
  { id: "c6", name: "Gujarat Garments (Gujarat)", gstin: "24AAHCG7890R1ZO", stateCode: "24",
    address: "Ring Rd, Surat - 395002", city: "Surat", pincode: "395002",
    phone: "+91 90000 66666", email: "info@gujaratgarments.in" },
  { id: "c7", name: "Uttam Stores (Uttar Pradesh)", gstin: "09AAFCU2345N1ZW", stateCode: "09",
    address: "Hazratganj, Lucknow - 226001", city: "Lucknow", pincode: "226001",
    phone: "+91 90000 77777", email: "uttam@stores.in" },
  { id: "c8", name: "Bengal Supplies (West Bengal)", gstin: "19AAKCB6789L1ZP", stateCode: "19",
    address: "Park St, Kolkata - 700016", city: "Kolkata", pincode: "700016",
    phone: "+91 90000 88888", email: "sales@bengalsupplies.in" },
  { id: "c9", name: "Kerala Coir Co (Kerala)", gstin: "32AALCK1122M1ZO", stateCode: "32",
    address: "MG Rd, Kochi - 682011", city: "Kochi", pincode: "682011",
    phone: "+91 90000 99999", email: "coir@keralacoir.in" },
  { id: "c10", name: "Telangana Tech (Telangana)", gstin: "36AAMCT3344P1ZO", stateCode: "36",
    address: "HITEC City, Hyderabad - 500081", city: "Hyderabad", pincode: "500081",
    phone: "+91 90001 00000", email: "hello@telanganatech.in" },
  { id: "c11", name: "Rajasthan Handicrafts (Rajasthan)", gstin: "08AANCR5566Q1ZA", stateCode: "08",
    address: "Johari Bazaar, Jaipur - 302003", city: "Jaipur", pincode: "302003",
    phone: "+91 90001 11111", email: "crafts@rajhandicrafts.in" },
  { id: "c12", name: "Haryana Auto Parts (Haryana)", gstin: "06AAOCH7788R1Z9", stateCode: "06",
    address: "IMT Manesar, Gurugram - 122051", city: "Gurugram", pincode: "122051",
    phone: "+91 90001 22222", email: "parts@haryanaauto.in" },

  // B2C (no GSTIN) intrastate + interstate
  { id: "c3", name: "Walk-in Customer (B2C)", stateCode: "33",
    address: "—", city: "Chennai", pincode: "600001",
    phone: "+91 90000 33333", email: "" },
  { id: "c13", name: "Ravi Kumar (B2C, Karnataka)", stateCode: "29",
    address: "Jayanagar, Bengaluru - 560011", city: "Bengaluru", pincode: "560011",
    phone: "+91 90001 33333", email: "ravi.k@gmail.com" },
];

export interface MockItem {
  id: string;
  name: string;
  hsnSac: string;
  unit: string;
  defaultRatePaise: number;
  gstRate: number;
}

// Items across all 5 GST slabs (0/5/12/18/28) and goods + services (SAC).
export const ITEMS: MockItem[] = [
  // 0% — essentials
  { id: "i6", name: "Fresh Rice (25kg bag)", hsnSac: "1006", unit: "bag", defaultRatePaise: 120000, gstRate: 0 },
  { id: "i7", name: "Wheat Flour (10kg)", hsnSac: "1101", unit: "bag", defaultRatePaise: 45000, gstRate: 0 },
  // 5%
  { id: "i4", name: "Cotton T-Shirt", hsnSac: "6109", unit: "pcs", defaultRatePaise: 39900, gstRate: 5 },
  { id: "i8", name: "Footwear (under ₹1000)", hsnSac: "6402", unit: "pair", defaultRatePaise: 79900, gstRate: 5 },
  { id: "i9", name: "Packaged Tea (500g)", hsnSac: "0902", unit: "pcs", defaultRatePaise: 29900, gstRate: 5 },
  // 12%
  { id: "i3", name: "LED Bulb 9W", hsnSac: "9405", unit: "pcs", defaultRatePaise: 9900, gstRate: 12 },
  { id: "i10", name: "Stainless Steel Bottle", hsnSac: "7323", unit: "pcs", defaultRatePaise: 49900, gstRate: 12 },
  { id: "i11", name: "Notebook (200 pages)", hsnSac: "4820", unit: "pcs", defaultRatePaise: 8900, gstRate: 12 },
  // 18%
  { id: "i1", name: "USB-C Cable 1m", hsnSac: "8544", unit: "pcs", defaultRatePaise: 19900, gstRate: 18 },
  { id: "i2", name: "Bluetooth Speaker", hsnSac: "8518", unit: "pcs", defaultRatePaise: 149900, gstRate: 18 },
  { id: "i12", name: "Office Chair", hsnSac: "9401", unit: "pcs", defaultRatePaise: 549900, gstRate: 18 },
  { id: "i13", name: "Laptop Backpack", hsnSac: "4202", unit: "pcs", defaultRatePaise: 129900, gstRate: 18 },
  // 28% — luxury / sin
  { id: "i14", name: "Air Conditioner 1.5T", hsnSac: "8415", unit: "pcs", defaultRatePaise: 3499900, gstRate: 28 },
  { id: "i15", name: "LED TV 43-inch", hsnSac: "8528", unit: "pcs", defaultRatePaise: 2899900, gstRate: 28 },
  // Services (SAC)
  { id: "i5", name: "Consulting (per hour)", hsnSac: "9983", unit: "hr", defaultRatePaise: 250000, gstRate: 18 },
  { id: "i16", name: "Annual Maintenance Contract", hsnSac: "9987", unit: "nos", defaultRatePaise: 1200000, gstRate: 18 },
];

export type InvoiceStatus = "paid" | "sent" | "draft" | "overdue";

interface RawInvoice {
  id: string;
  invoiceNo: string;
  isoDate: string; // YYYY-MM-DD
  date: string; // display string
  customerId: string;
  status: InvoiceStatus;
  eInvoice: boolean; // IRN generated?
  whatsappSent: boolean;
  lines: InvoiceLineInput[];
}

// Realistic line items so GSTR-1 rate-wise grouping is genuinely correct.
// Mix of intrastate (CGST+SGST), interstate (IGST) and B2C, across all GST slabs.
const RAW_INVOICES: RawInvoice[] = [
  // ---- April 2026 (prior return period — demonstrates the period selector) ----
  { id: "INV-2425-0001", invoiceNo: "INV-2425-0001", isoDate: "2026-04-10", date: "10 Apr 2026",
    customerId: "c4", status: "paid", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Air Conditioner 1.5T", hsnSac: "8415", qty: 4, unit: "pcs", ratePaise: 3499900, gstRate: 28 },
      { description: "LED TV 43-inch", hsnSac: "8528", qty: 2, unit: "pcs", ratePaise: 2899900, gstRate: 28 },
    ] },
  { id: "INV-2425-0002", invoiceNo: "INV-2425-0002", isoDate: "2026-04-18", date: "18 Apr 2026",
    customerId: "c1", status: "paid", eInvoice: false, whatsappSent: true,
    lines: [
      { description: "Office Chair", hsnSac: "9401", qty: 6, unit: "pcs", ratePaise: 549900, gstRate: 18 },
      { description: "Laptop Backpack", hsnSac: "4202", qty: 10, unit: "pcs", ratePaise: 129900, gstRate: 18 },
    ] },
  { id: "INV-2425-0003", invoiceNo: "INV-2425-0003", isoDate: "2026-04-25", date: "25 Apr 2026",
    customerId: "c13", status: "paid", eInvoice: false, whatsappSent: false,
    lines: [
      { description: "Footwear (under ₹1000)", hsnSac: "6402", qty: 2, unit: "pair", ratePaise: 79900, gstRate: 5 },
      { description: "Cotton T-Shirt", hsnSac: "6109", qty: 3, unit: "pcs", ratePaise: 39900, gstRate: 5 },
    ] },

  // ---- May 2026 (current demo period) ----
  { id: "INV-2425-0004", invoiceNo: "INV-2425-0004", isoDate: "2026-05-04", date: "04 May 2026",
    customerId: "c5", status: "paid", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Annual Maintenance Contract", hsnSac: "9987", qty: 1, unit: "nos", ratePaise: 1200000, gstRate: 18 },
      { description: "Consulting (per hour)", hsnSac: "9983", qty: 20, unit: "hr", ratePaise: 250000, gstRate: 18 },
    ] },
  { id: "INV-2425-0005", invoiceNo: "INV-2425-0005", isoDate: "2026-05-08", date: "08 May 2026",
    customerId: "c6", status: "paid", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Cotton T-Shirt", hsnSac: "6109", qty: 100, unit: "pcs", ratePaise: 39900, gstRate: 5 },
    ] },
  { id: "INV-2425-0006", invoiceNo: "INV-2425-0006", isoDate: "2026-05-11", date: "11 May 2026",
    customerId: "c9", status: "paid", eInvoice: false, whatsappSent: false,
    lines: [
      { description: "Fresh Rice (25kg bag)", hsnSac: "1006", qty: 20, unit: "bag", ratePaise: 120000, gstRate: 0 },
      { description: "Wheat Flour (10kg)", hsnSac: "1101", qty: 15, unit: "bag", ratePaise: 45000, gstRate: 0 },
      { description: "Packaged Tea (500g)", hsnSac: "0902", qty: 40, unit: "pcs", ratePaise: 29900, gstRate: 5 },
    ] },
  { id: "INV-2425-0007", invoiceNo: "INV-2425-0007", isoDate: "2026-05-15", date: "15 May 2026",
    customerId: "c1", status: "draft", eInvoice: false, whatsappSent: false,
    lines: [
      { description: "Bluetooth Speaker", hsnSac: "8518", qty: 2, unit: "pcs", ratePaise: 149900, gstRate: 18 },
    ] },
  { id: "INV-2425-0008", invoiceNo: "INV-2425-0008", isoDate: "2026-05-18", date: "18 May 2026",
    customerId: "c7", status: "paid", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Stainless Steel Bottle", hsnSac: "7323", qty: 50, unit: "pcs", ratePaise: 49900, gstRate: 12 },
      { description: "Notebook (200 pages)", hsnSac: "4820", qty: 200, unit: "pcs", ratePaise: 8900, gstRate: 12 },
    ] },
  { id: "INV-2425-0009", invoiceNo: "INV-2425-0009", isoDate: "2026-05-21", date: "21 May 2026",
    customerId: "c2", status: "sent", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Consulting (per hour)", hsnSac: "9983", qty: 30, unit: "hr", ratePaise: 250000, gstRate: 18 },
    ] },
  { id: "INV-2425-0010", invoiceNo: "INV-2425-0010", isoDate: "2026-05-24", date: "24 May 2026",
    customerId: "c3", status: "paid", eInvoice: false, whatsappSent: false,
    lines: [
      { description: "LED Bulb 9W", hsnSac: "9405", qty: 10, unit: "pcs", ratePaise: 9900, gstRate: 12 },
      { description: "Cotton T-Shirt", hsnSac: "6109", qty: 3, unit: "pcs", ratePaise: 39900, gstRate: 5 },
    ] },
  { id: "INV-2425-0011", invoiceNo: "INV-2425-0011", isoDate: "2026-05-26", date: "26 May 2026",
    customerId: "c10", status: "sent", eInvoice: true, whatsappSent: false,
    lines: [
      { description: "LED TV 43-inch", hsnSac: "8528", qty: 5, unit: "pcs", ratePaise: 2899900, gstRate: 28 },
    ] },
  { id: "INV-2425-0012", invoiceNo: "INV-2425-0012", isoDate: "2026-05-28", date: "28 May 2026",
    customerId: "c8", status: "sent", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Bluetooth Speaker", hsnSac: "8518", qty: 30, unit: "pcs", ratePaise: 149900, gstRate: 18 },
      { description: "USB-C Cable 1m", hsnSac: "8544", qty: 50, unit: "pcs", ratePaise: 19900, gstRate: 18 },
    ] },
  { id: "INV-2425-0013", invoiceNo: "INV-2425-0013", isoDate: "2026-05-29", date: "29 May 2026",
    customerId: "c11", status: "paid", eInvoice: false, whatsappSent: true,
    lines: [
      { description: "Office Chair", hsnSac: "9401", qty: 12, unit: "pcs", ratePaise: 549900, gstRate: 18 },
    ] },
  { id: "INV-2425-0014", invoiceNo: "INV-2425-0014", isoDate: "2026-05-30", date: "30 May 2026",
    customerId: "c12", status: "sent", eInvoice: true, whatsappSent: false,
    lines: [
      { description: "Air Conditioner 1.5T", hsnSac: "8415", qty: 3, unit: "pcs", ratePaise: 3499900, gstRate: 28 },
      { description: "Annual Maintenance Contract", hsnSac: "9987", qty: 1, unit: "nos", ratePaise: 1200000, gstRate: 18 },
    ] },
];

export interface MockInvoice extends RawInvoice {
  taxType: TaxType;
  taxablePaise: number;
  taxPaise: number;
  grandTotalPaise: number;
  totals: InvoiceTotals;
}

// Derive every total from the real GST engine so list/dashboard/GSTR are all consistent.
export const INVOICES: MockInvoice[] = RAW_INVOICES.map((r) => {
  const cust = CUSTOMERS.find((c) => c.id === r.customerId)!;
  const totals = calculateInvoice(r.lines, SELLER.stateCode, cust.stateCode, cust.gstin);
  return {
    ...r,
    taxType: totals.taxType,
    taxablePaise: totals.subtotalPaise,
    taxPaise: totals.totalTaxPaise,
    grandTotalPaise: totals.grandTotalPaise,
    totals,
  };
});

export function customerName(id: string): string {
  return CUSTOMERS.find((c) => c.id === id)?.name ?? "Unknown";
}

export function getCustomer(id: string): MockCustomer | undefined {
  return CUSTOMERS.find((c) => c.id === id);
}

/** Aggregates for the dashboard KPIs. */
export function dashboardStats() {
  const totalSalesPaise = INVOICES.filter((i) => i.status !== "draft").reduce((s, i) => s + i.grandTotalPaise, 0);
  const gstCollectedPaise = INVOICES.filter((i) => i.status !== "draft").reduce((s, i) => s + i.taxPaise, 0);
  const unpaidPaise = INVOICES.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.grandTotalPaise, 0);
  const eInvoiceCount = INVOICES.filter((i) => i.eInvoice).length;
  return {
    totalSalesPaise,
    gstCollectedPaise,
    unpaidPaise,
    invoiceCount: INVOICES.length,
    eInvoiceCount,
  };
}
