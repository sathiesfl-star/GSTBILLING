/**
 * Server-only data access. Every query is scoped to a businessId (multi-tenant).
 * Returns plain, serializable objects shaped for the UI.
 */
import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { Customer } from "@/models/Customer";
import { Item } from "@/models/Item";
import { Invoice, type InvoiceStatus } from "@/models/Invoice";
import {
  buildGstr1,
  buildGstr3b,
  gstrSummary,
  filingPeriod,
  type GstrInvoice,
} from "@/lib/gstr/gstr1";

function isoDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

type UiStatus = "paid" | "sent" | "draft" | "overdue";
function uiStatus(s: InvoiceStatus): UiStatus {
  if (s === "paid") return "paid";
  if (s === "draft") return "draft";
  if (s === "cancelled") return "draft";
  return "sent"; // sent | finalized
}

export interface UiInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  taxType: "intrastate" | "interstate" | "b2c";
  taxablePaise: number;
  taxPaise: number;
  grandTotalPaise: number;
  eInvoice: boolean;
  eWayBill: boolean;
  whatsappSent: boolean;
  status: UiStatus;
}

export async function getBusiness(businessId: string) {
  await connectToDatabase();
  const b = await Business.findById(businessId).lean();
  if (!b) return null;
  return {
    id: b._id.toString(),
    name: b.name,
    gstin: b.gstin,
    stateCode: b.stateCode,
    financialYear: b.financialYear,
    plan: b.plan,
    planStatus: b.planStatus ?? null,
    planExpiry: b.planExpiry ? fmtDate(new Date(b.planExpiry)) : null,
    trialEndsAt: b.trialEndsAt ? fmtDate(new Date(b.trialEndsAt)) : null,
    eInvoiceEnabled: b.eInvoiceEnabled,
    address: b.address ?? {},
    phone: b.phone ?? "",
    email: b.email ?? "",
    bankDetails: b.bankDetails ?? null,
  };
}

export async function listInvoices(businessId: string): Promise<UiInvoice[]> {
  await connectToDatabase();
  const docs = await Invoice.find({ businessId }).sort({ invoiceDate: -1 }).lean();
  return docs.map((d) => ({
    id: d._id.toString(),
    invoiceNo: d.invoiceNo,
    date: fmtDate(new Date(d.invoiceDate)),
    customerName: d.customerSnapshot?.name ?? "—",
    taxType: d.taxType,
    taxablePaise: d.subtotalPaise,
    taxPaise: d.totalCgstPaise + d.totalSgstPaise + d.totalIgstPaise,
    grandTotalPaise: d.grandTotalPaise,
    eInvoice: d.einvoice?.status === "generated",
    eWayBill: !!d.ewaybill?.ewbNo,
    whatsappSent: !!d.whatsappSentAt,
    status: uiStatus(d.status),
  }));
}

export async function dashboardStats(businessId: string) {
  const invoices = await listInvoices(businessId);
  const billable = invoices.filter((i) => i.status !== "draft");
  return {
    totalSalesPaise: billable.reduce((s, i) => s + i.grandTotalPaise, 0),
    gstCollectedPaise: billable.reduce((s, i) => s + i.taxPaise, 0),
    unpaidPaise: invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.grandTotalPaise, 0),
    invoiceCount: invoices.length,
    eInvoiceCount: invoices.filter((i) => i.eInvoice).length,
    recent: invoices.slice(0, 5),
  };
}

export async function listCustomers(businessId: string) {
  await connectToDatabase();
  const docs = await Customer.find({ businessId }).sort({ name: 1 }).lean();
  return docs.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    gstin: c.gstin ?? undefined,
    stateCode: c.stateCode,
    address: c.address?.line1 ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
  }));
}

export async function listItems(businessId: string) {
  await connectToDatabase();
  const docs = await Item.find({ businessId }).sort({ name: 1 }).lean();
  return docs.map((it) => ({
    id: it._id.toString(),
    name: it.name,
    hsnSac: it.hsnSac,
    unit: it.unit,
    defaultRatePaise: it.defaultRatePaise,
    gstRate: it.gstRate,
  }));
}

/** Fetch a single invoice with full detail (for preview). */
export async function getInvoice(businessId: string, invoiceId: string) {
  await connectToDatabase();
  const d = await Invoice.findOne({ _id: invoiceId, businessId }).lean();
  if (!d) return null;
  return {
    id: d._id.toString(),
    invoiceNo: d.invoiceNo,
    invoiceDate: fmtDate(new Date(d.invoiceDate)),
    customerSnapshot: d.customerSnapshot,
    placeOfSupplyStateCode: d.placeOfSupplyStateCode,
    taxType: d.taxType,
    lineItems: d.lineItems.map((l) => ({
      description: l.description,
      hsnSac: l.hsnSac,
      qty: l.qty,
      unit: l.unit,
      ratePaise: l.ratePaise,
      gstRate: l.gstRate,
      taxablePaise: l.taxablePaise,
      cgstPaise: l.cgstPaise,
      sgstPaise: l.sgstPaise,
      igstPaise: l.igstPaise,
      totalPaise: l.totalPaise,
    })),
    subtotalPaise: d.subtotalPaise,
    totalCgstPaise: d.totalCgstPaise,
    totalSgstPaise: d.totalSgstPaise,
    totalIgstPaise: d.totalIgstPaise,
    roundOffPaise: d.roundOffPaise,
    grandTotalPaise: d.grandTotalPaise,
    amountInWords: d.amountInWords,
    status: uiStatus(d.status),
    einvoice: d.einvoice,
    ewaybill: d.ewaybill?.ewbNo
      ? { ewbNo: d.ewaybill.ewbNo, validUpto: d.ewaybill.validUpto ? fmtDate(new Date(d.ewaybill.validUpto)) : "" }
      : null,
    notes: d.notes,
  };
}

/** Preview the next invoice number (not yet consumed). */
export async function getNextInvoiceNo(businessId: string, financialYear: string) {
  const { Counter } = await import("@/models/Counter");
  await connectToDatabase();
  const key = `${businessId}:${financialYear}`;
  const doc = await Counter.findById(key).lean();
  const nextSeq = (doc?.seq ?? 0) + 1;
  const fyShort = financialYear.replace("-", "").slice(-4);
  return `INV-${fyShort}-${nextSeq.toString().padStart(4, "0")}`;
}

/**
 * Everything the invoice builder needs in one round-trip:
 * the seller (business), its customers and items, and the next invoice number preview.
 */
export async function getBuilderData(businessId: string) {
  await connectToDatabase();
  const [business, customers, items] = await Promise.all([
    getBusiness(businessId),
    listCustomers(businessId),
    listItems(businessId),
  ]);
  const nextInvoiceNo = business
    ? await getNextInvoiceNo(businessId, business.financialYear)
    : "INV-0000-0001";
  return {
    seller: business
      ? { name: business.name, gstin: business.gstin, stateCode: business.stateCode }
      : null,
    customers,
    items,
    nextInvoiceNo,
  };
}

/**
 * Build GSTR-1, GSTR-3B and a summary for a business + filing period (MMYYYY).
 * If period is omitted, uses the most recent non-draft invoice's period (else current month).
 */
export async function getGstrData(businessId: string, period?: string) {
  await connectToDatabase();
  const business = await getBusiness(businessId);
  if (!business) return null;

  // Only filed (non-draft, non-cancelled) invoices are reported.
  const docs = await Invoice.find({
    businessId,
    status: { $in: ["finalized", "sent", "paid"] },
  })
    .sort({ invoiceDate: -1 })
    .lean();

  const all: (GstrInvoice & { period: string })[] = docs.map((d) => {
    const iso = isoDate(new Date(d.invoiceDate));
    return {
      period: filingPeriod(iso),
      invoiceNo: d.invoiceNo,
      isoDate: iso,
      grandTotalPaise: d.grandTotalPaise,
      subtotalPaise: d.subtotalPaise,
      totalCgstPaise: d.totalCgstPaise,
      totalSgstPaise: d.totalSgstPaise,
      totalIgstPaise: d.totalIgstPaise,
      totalTaxPaise: d.totalCgstPaise + d.totalSgstPaise + d.totalIgstPaise,
      buyerGstin: d.customerSnapshot?.gstin || undefined,
      buyerStateCode: d.customerSnapshot?.stateCode ?? business.stateCode,
      lines: d.lineItems.map((l) => ({
        gstRate: l.gstRate,
        taxablePaise: l.taxablePaise,
        cgstPaise: l.cgstPaise,
        sgstPaise: l.sgstPaise,
        igstPaise: l.igstPaise,
      })),
    };
  });

  const availablePeriods = [...new Set(all.map((i) => i.period))];
  const now = new Date();
  const currentPeriod = `${String(now.getUTCMonth() + 1).padStart(2, "0")}${now.getUTCFullYear()}`;
  const usePeriod = period ?? availablePeriods[0] ?? currentPeriod;

  const seller = { gstin: business.gstin, stateCode: business.stateCode };
  const invoices: GstrInvoice[] = all.filter((i) => i.period === usePeriod);

  return {
    period: usePeriod,
    availablePeriods,
    gstr1: buildGstr1(invoices, seller, usePeriod),
    gstr3b: buildGstr3b(invoices, seller, usePeriod),
    summary: gstrSummary(invoices, seller, usePeriod),
  };
}
