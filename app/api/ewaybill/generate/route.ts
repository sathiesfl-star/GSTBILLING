import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import { Business } from "@/models/Business";
import { getActiveBusinessId } from "@/lib/session";
import { limitsFor, upgradeMessage } from "@/lib/plan-limits";
import {
  buildEwbPayload,
  computeValidUpto,
  mockEwbNo,
  EWB_THRESHOLD_PAISE,
  type EwbInvoiceData,
  type TransportDetails,
} from "@/lib/ewaybill";

export const runtime = "nodejs";

interface Body {
  invoiceId: string;
  mode: string;
  vehicleNo?: string;
  transporterName?: string;
  transporterGstin?: string;
  distanceKm: number;
}

function ddmmyyyy(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 422 });
  }
  if (!body.mode) {
    return NextResponse.json({ error: "Transport mode is required" }, { status: 422 });
  }

  await connectToDatabase();
  const [business, invoice] = await Promise.all([
    Business.findById(businessId).lean(),
    Invoice.findOne({ _id: body.invoiceId, businessId }).lean(),
  ]);
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Plan gate: e-way bill is a Professional+ feature.
  if (!limitsFor(business.plan).eWayBill) {
    return NextResponse.json(
      { error: upgradeMessage("ewaybill"), code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }

  if (invoice.grandTotalPaise <= EWB_THRESHOLD_PAISE) {
    return NextResponse.json(
      { error: "E-way bill is only required for consignments above ₹50,000." },
      { status: 422 }
    );
  }

  const transport: TransportDetails = {
    mode: body.mode,
    vehicleNo: body.vehicleNo,
    transporterName: body.transporterName,
    transporterGstin: body.transporterGstin,
    distanceKm: Number(body.distanceKm) || 0,
  };

  const ewbData: EwbInvoiceData = {
    docNo: invoice.invoiceNo,
    docDate: ddmmyyyy(new Date(invoice.invoiceDate)),
    fromGstin: business.gstin,
    fromName: business.name,
    fromStateCode: business.stateCode,
    fromPincode: business.address?.pincode,
    toGstin: invoice.customerSnapshot?.gstin,
    toName: invoice.customerSnapshot?.name ?? "",
    toStateCode: invoice.customerSnapshot?.stateCode ?? business.stateCode,
    subtotalPaise: invoice.subtotalPaise,
    cgstPaise: invoice.totalCgstPaise,
    sgstPaise: invoice.totalSgstPaise,
    igstPaise: invoice.totalIgstPaise,
    grandTotalPaise: invoice.grandTotalPaise,
    lines: invoice.lineItems.map((l) => ({
      description: l.description,
      hsnSac: l.hsnSac,
      qty: l.qty,
      unit: l.unit,
      taxablePaise: l.taxablePaise,
      gstRate: l.gstRate,
    })),
  };

  const payload = buildEwbPayload(ewbData, transport);
  const now = new Date();
  const ewbNo = mockEwbNo(`${invoice._id}${invoice.grandTotalPaise}${transport.distanceKm}`);
  const validUpto = computeValidUpto(transport.distanceKm, now);

  await Invoice.updateOne(
    { _id: invoice._id, businessId },
    { $set: { ewaybill: { ewbNo, validUpto } } }
  );

  return NextResponse.json({
    ok: true,
    mode: "stub",
    signed: false,
    ewbNo,
    validUpto: validUpto.toISOString(),
    validUptoStr: ddmmyyyy(validUpto),
    transMode: transport.mode,
    distanceKm: transport.distanceKm,
    payload,
  });
}
