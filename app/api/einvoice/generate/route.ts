import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { Customer } from "@/models/Customer";
import { calculateInvoice, type InvoiceLineInput } from "@/lib/gst-calculator";
import { getGspAdapter } from "@/lib/einvoice/gsp";
import type { Party } from "@/lib/einvoice/payload";
import { getActiveBusinessId } from "@/lib/session";

export const runtime = "nodejs";

interface Body {
  customerId: string;
  docNo: string;
  docDate: string; // dd/mm/yyyy
  lines: { description: string; hsnSac: string; qty: number; unit: string; rateRupees: number; gstRate: number }[];
}

export async function POST(req: Request) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await connectToDatabase();

  // Fetch seller (business) and customer from DB
  const [business, customer] = await Promise.all([
    Business.findById(businessId).lean(),
    Customer.findById(body.customerId).lean(),
  ]);

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }
  if (!customer || customer.businessId.toString() !== businessId) {
    return NextResponse.json({ error: "Unknown customer" }, { status: 404 });
  }
  if (!customer.gstin) {
    return NextResponse.json(
      { error: "E-invoicing (IRN) applies to B2B invoices only. This customer has no GSTIN." },
      { status: 422 }
    );
  }
  if (!body.lines?.length) {
    return NextResponse.json({ error: "At least one line item is required" }, { status: 422 });
  }

  // Recompute totals server-side using the real GST engine (never trust client math).
  const items: InvoiceLineInput[] = body.lines.map((l) => ({
    description: l.description || "Item",
    hsnSac: l.hsnSac,
    qty: Number(l.qty) || 0,
    unit: l.unit,
    ratePaise: Math.round((Number(l.rateRupees) || 0) * 100),
    gstRate: l.gstRate,
  }));
  const totals = calculateInvoice(items, business.stateCode, customer.stateCode, customer.gstin);

  const seller: Party = {
    gstin: business.gstin,
    legalName: business.name,
    address: business.address?.line1 ?? "",
    city: business.address?.city ?? "",
    pincode: business.address?.pincode ?? "",
    stateCode: business.stateCode,
    phone: business.phone ?? "",
    email: business.email ?? "",
  };
  const buyer: Party = {
    gstin: customer.gstin,
    legalName: customer.name,
    address: customer.address?.line1 ?? "",
    city: customer.address?.city ?? "",
    pincode: customer.address?.pincode ?? "",
    stateCode: customer.stateCode,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
  };

  try {
    const adapter = getGspAdapter();
    const result = await adapter.generateIrn({
      docType: "INV",
      docNo: body.docNo,
      docDate: body.docDate,
      seller,
      buyer,
      totals,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "E-invoice generation failed" },
      { status: 502 }
    );
  }
}
