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
  {
    id: "c1",
    name: "Anand Electronics (Tamil Nadu)",
    gstin: "33AABCA1234M1Z5",
    stateCode: "33",
    address: "45 Ranganathan St, T Nagar, Chennai - 600017",
    city: "Chennai",
    pincode: "600017",
    phone: "+91 90000 11111",
    email: "accounts@anandelectronics.in",
  },
  {
    id: "c2",
    name: "Mehta Distributors (Maharashtra)",
    gstin: "27AAACM5678K1Z3",
    stateCode: "27",
    address: "8 MG Road, Andheri, Mumbai - 400069",
    city: "Mumbai",
    pincode: "400069",
    phone: "+91 90000 22222",
    email: "purchase@mehtadist.com",
  },
  {
    id: "c3",
    name: "Walk-in Customer (B2C)",
    stateCode: "33",
    address: "—",
    city: "Chennai",
    pincode: "600001",
    phone: "+91 90000 33333",
    email: "",
  },
];

export interface MockItem {
  id: string;
  name: string;
  hsnSac: string;
  unit: string;
  defaultRatePaise: number;
  gstRate: number;
}

export const ITEMS: MockItem[] = [
  { id: "i1", name: "USB-C Cable 1m", hsnSac: "8544", unit: "pcs", defaultRatePaise: 19900, gstRate: 18 },
  { id: "i2", name: "Bluetooth Speaker", hsnSac: "8518", unit: "pcs", defaultRatePaise: 149900, gstRate: 18 },
  { id: "i3", name: "LED Bulb 9W", hsnSac: "9405", unit: "pcs", defaultRatePaise: 9900, gstRate: 12 },
  { id: "i4", name: "Cotton T-Shirt", hsnSac: "6109", unit: "pcs", defaultRatePaise: 39900, gstRate: 5 },
  { id: "i5", name: "Consulting (per hour)", hsnSac: "9983", unit: "hr", defaultRatePaise: 250000, gstRate: 18 },
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
const RAW_INVOICES: RawInvoice[] = [
  {
    id: "INV-2425-0006", invoiceNo: "INV-2425-0006", isoDate: "2026-05-28", date: "28 May 2026",
    customerId: "c2", status: "sent", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Bluetooth Speaker", hsnSac: "8518", qty: 30, unit: "pcs", ratePaise: 149900, gstRate: 18 },
      { description: "USB-C Cable 1m", hsnSac: "8544", qty: 50, unit: "pcs", ratePaise: 19900, gstRate: 18 },
    ],
  },
  {
    id: "INV-2425-0005", invoiceNo: "INV-2425-0005", isoDate: "2026-05-26", date: "26 May 2026",
    customerId: "c1", status: "paid", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Bluetooth Speaker", hsnSac: "8518", qty: 8, unit: "pcs", ratePaise: 149900, gstRate: 18 },
      { description: "LED Bulb 9W", hsnSac: "9405", qty: 20, unit: "pcs", ratePaise: 9900, gstRate: 12 },
    ],
  },
  {
    id: "INV-2425-0004", invoiceNo: "INV-2425-0004", isoDate: "2026-05-24", date: "24 May 2026",
    customerId: "c3", status: "paid", eInvoice: false, whatsappSent: false,
    lines: [
      { description: "LED Bulb 9W", hsnSac: "9405", qty: 10, unit: "pcs", ratePaise: 9900, gstRate: 12 },
      { description: "Cotton T-Shirt", hsnSac: "6109", qty: 3, unit: "pcs", ratePaise: 39900, gstRate: 5 },
    ],
  },
  {
    id: "INV-2425-0003", invoiceNo: "INV-2425-0003", isoDate: "2026-05-21", date: "21 May 2026",
    customerId: "c2", status: "overdue", eInvoice: true, whatsappSent: true,
    lines: [
      { description: "Consulting (per hour)", hsnSac: "9983", qty: 30, unit: "hr", ratePaise: 250000, gstRate: 18 },
    ],
  },
  {
    id: "INV-2425-0002", invoiceNo: "INV-2425-0002", isoDate: "2026-05-18", date: "18 May 2026",
    customerId: "c1", status: "paid", eInvoice: false, whatsappSent: true,
    lines: [
      { description: "Cotton T-Shirt", hsnSac: "6109", qty: 5, unit: "pcs", ratePaise: 39900, gstRate: 5 },
      { description: "USB-C Cable 1m", hsnSac: "8544", qty: 10, unit: "pcs", ratePaise: 19900, gstRate: 18 },
    ],
  },
  {
    id: "INV-2425-0001", invoiceNo: "INV-2425-0001", isoDate: "2026-05-15", date: "15 May 2026",
    customerId: "c1", status: "draft", eInvoice: false, whatsappSent: false,
    lines: [
      { description: "Bluetooth Speaker", hsnSac: "8518", qty: 2, unit: "pcs", ratePaise: 149900, gstRate: 18 },
    ],
  },
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
