import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Item } from "@/models/Item";
import { getActiveBusinessId } from "@/lib/session";
import { GST_RATES } from "@/lib/gst-calculator";

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

  const { name, hsnSac, unit, defaultRateRupees, gstRate } = body ?? {};

  if (!name?.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 422 });
  }
  if (!hsnSac?.trim()) {
    return NextResponse.json({ error: "HSN/SAC code is required" }, { status: 422 });
  }

  const rate = Number(gstRate);
  if (!GST_RATES.includes(rate as any)) {
    return NextResponse.json({ error: `GST rate must be one of: ${GST_RATES.join(", ")}` }, { status: 422 });
  }

  const ratePaise = Math.round((Number(defaultRateRupees) || 0) * 100);

  await connectToDatabase();

  const doc = await Item.findOneAndUpdate(
    { _id: params.id, businessId },
    {
      $set: {
        name: name.trim(),
        hsnSac: hsnSac.trim(),
        unit: unit?.trim() || "pcs",
        defaultRatePaise: ratePaise,
        gstRate: rate,
      },
    },
    { new: true }
  ).lean();

  if (!doc) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: { id: doc._id.toString(), name: doc.name } });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectToDatabase();
  const res = await Item.deleteOne({ _id: params.id, businessId });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
