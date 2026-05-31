import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { getActiveBusinessId } from "@/lib/session";
import { validateGSTIN, INDIAN_STATE_CODES } from "@/lib/gst-calculator";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, gstin, stateCode, address, phone, email } = body ?? {};

  if (!name?.trim()) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 422 });
  }

  const sc = String(stateCode ?? "").trim();
  if (!sc || !INDIAN_STATE_CODES.some((s) => s.code === sc)) {
    return NextResponse.json({ error: "Valid state code is required" }, { status: 422 });
  }

  let cleanGstin: string | undefined;
  if (gstin && String(gstin).trim()) {
    const g = String(gstin).toUpperCase().trim();
    const result = validateGSTIN(g);
    if (!result.valid) {
      return NextResponse.json({ error: `Invalid GSTIN: ${result.reason}` }, { status: 422 });
    }
    if (result.stateCode !== sc) {
      return NextResponse.json(
        { error: `GSTIN state code (${result.stateCode}) doesn't match selected state (${sc})` },
        { status: 422 }
      );
    }
    cleanGstin = g;
  }

  await connectToDatabase();

  const doc = await Customer.findOneAndUpdate(
    { _id: params.id, businessId },
    {
      $set: {
        name: name.trim(),
        gstin: cleanGstin ?? null,
        stateCode: sc,
        "address.line1": address?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
      },
    },
    { new: true }
  ).lean();

  if (!doc) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, customer: { id: doc._id.toString(), name: doc.name } });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectToDatabase();
  const res = await Customer.deleteOne({ _id: params.id, businessId });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
