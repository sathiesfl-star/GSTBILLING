import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { getActiveBusinessId } from "@/lib/session";
import { validateGSTIN, INDIAN_STATE_CODES } from "@/lib/gst-calculator";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  // Validate state code
  const sc = String(stateCode ?? "").trim();
  if (!sc || !INDIAN_STATE_CODES.some((s) => s.code === sc)) {
    return NextResponse.json({ error: "Valid state code is required" }, { status: 422 });
  }

  // If GSTIN provided, validate it
  let cleanGstin: string | undefined;
  if (gstin && String(gstin).trim()) {
    const g = String(gstin).toUpperCase().trim();
    const result = validateGSTIN(g);
    if (!result.valid) {
      return NextResponse.json({ error: `Invalid GSTIN: ${result.reason}` }, { status: 422 });
    }
    // Ensure GSTIN state code matches the selected state
    if (result.stateCode !== sc) {
      return NextResponse.json(
        { error: `GSTIN state code (${result.stateCode}) doesn't match selected state (${sc})` },
        { status: 422 }
      );
    }
    cleanGstin = g;
  }

  await connectToDatabase();

  const doc = await Customer.create({
    businessId,
    name: name.trim(),
    gstin: cleanGstin,
    stateCode: sc,
    address: {
      line1: address?.trim() || undefined,
    },
    phone: phone?.trim() || undefined,
    email: email?.trim() || undefined,
  });

  return NextResponse.json({
    ok: true,
    customer: {
      id: doc._id.toString(),
      name: doc.name,
      gstin: doc.gstin,
      stateCode: doc.stateCode,
    },
  });
}
