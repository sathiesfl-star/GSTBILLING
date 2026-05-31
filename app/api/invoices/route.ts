import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { Business } from "@/models/Business";
import { nextSequence } from "@/models/Counter";
import { getActiveBusinessId } from "@/lib/session";
import { calculateInvoice, type InvoiceLineInput } from "@/lib/gst-calculator";
import { canCreateInvoice, upgradeMessage } from "@/lib/plan-limits";

export const runtime = "nodejs";

interface LineBody {
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  rateRupees: number;
  gstRate: number;
}

interface EInvoiceBody {
  irn?: string;
  ackNo?: string;
  ackDt?: string;
  signedQrString?: string;
}

interface CreateBody {
  customerId: string;
  lines: LineBody[];
  notes?: string;
  status?: "draft" | "finalized";
  einvoice?: EInvoiceBody;
}

export async function POST(req: Request) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 422 });
  }
  if (!body.lines?.length) {
    return NextResponse.json({ error: "At least one line item is required" }, { status: 422 });
  }

  await connectToDatabase();

  // Fetch business (seller) and customer (buyer) from DB
  const [business, customer] = await Promise.all([
    Business.findById(businessId).lean(),
    Customer.findById(body.customerId).lean(),
  ]);

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }
  if (!customer || customer.businessId.toString() !== businessId) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Plan limit: free tier is capped at 20 invoices/month.
  const cap = await canCreateInvoice(businessId, business.plan);
  if (!cap.allowed) {
    return NextResponse.json(
      { error: upgradeMessage("invoices"), code: "PLAN_LIMIT", used: cap.used, limit: cap.limit },
      { status: 403 }
    );
  }

  // Recompute totals server-side (never trust client math)
  const items: InvoiceLineInput[] = body.lines.map((l) => ({
    description: l.description || "Item",
    hsnSac: l.hsnSac || "",
    qty: Number(l.qty) || 0,
    unit: l.unit || "pcs",
    ratePaise: Math.round((Number(l.rateRupees) || 0) * 100),
    gstRate: l.gstRate,
  }));

  const totals = calculateInvoice(
    items,
    business.stateCode,
    customer.stateCode,
    customer.gstin
  );

  // Atomic invoice number
  const fy = business.financialYear || "2024-25";
  const fyShort = fy.replace("-", "").slice(-4); // "2024-25" -> "2425"
  const seq = await nextSequence(`${businessId}:${fy}`);
  const invoiceNo = `INV-${fyShort}-${seq.toString().padStart(4, "0")}`;

  const status = body.status === "finalized" ? "finalized" : "draft";
  const now = new Date();

  // Persist a client-generated IRN if one was attached (only meaningful for B2B).
  const e = body.einvoice;
  const einvoice =
    e?.irn && customer.gstin
      ? {
          irn: e.irn,
          ackNo: e.ackNo,
          ackDate: e.ackDt,
          signedQrCode: e.signedQrString,
          status: "generated" as const,
        }
      : { status: "none" as const };

  const doc = await Invoice.create({
    businessId,
    invoiceNo,
    invoiceDate: now,
    customerId: customer._id,
    customerSnapshot: {
      name: customer.name,
      gstin: customer.gstin,
      stateCode: customer.stateCode,
      address: customer.address?.line1,
      phone: customer.phone,
      email: customer.email,
    },
    placeOfSupplyStateCode: customer.stateCode,
    taxType: totals.taxType,
    lineItems: totals.lines.map((l) => ({
      description: l.description,
      hsnSac: l.hsnSac,
      qty: l.qty,
      unit: l.unit,
      ratePaise: l.ratePaise,
      gstRate: l.gstRate,
      cessRate: 0,
      taxablePaise: l.taxablePaise,
      cgstPaise: l.cgstPaise,
      sgstPaise: l.sgstPaise,
      igstPaise: l.igstPaise,
      cessPaise: 0,
      totalPaise: l.totalPaise,
    })),
    subtotalPaise: totals.subtotalPaise,
    totalCgstPaise: totals.totalCgstPaise,
    totalSgstPaise: totals.totalSgstPaise,
    totalIgstPaise: totals.totalIgstPaise,
    totalCessPaise: 0,
    roundOffPaise: totals.roundOffPaise,
    grandTotalPaise: totals.grandTotalPaise,
    amountInWords: totals.amountInWords,
    status,
    notes: body.notes,
    einvoice,
    ewaybill: {},
    finalizedAt: status === "finalized" ? now : undefined,
  });

  return NextResponse.json({
    ok: true,
    invoice: {
      id: doc._id.toString(),
      invoiceNo: doc.invoiceNo,
      status: doc.status,
      grandTotalPaise: doc.grandTotalPaise,
    },
  });
}
