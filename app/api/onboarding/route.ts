import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { getSession } from "@/lib/session";
import { INDIAN_STATE_CODES } from "@/lib/gst-calculator";

export const runtime = "nodejs";

/** Creates the first Business for a logged-in user who doesn't have one yet (Google onboarding). */
export async function POST(req: Request) {
  const session = await getSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { businessName, gstin } = body ?? {};
  if (!businessName?.trim() || !gstin) {
    return NextResponse.json({ error: "Business name and GSTIN are required" }, { status: 422 });
  }

  const g = String(gstin).toUpperCase().trim();
  const stateCode = g.slice(0, 2);
  if (g.length !== 15 || !INDIAN_STATE_CODES.some((s) => s.code === stateCode)) {
    return NextResponse.json({ error: "Invalid GSTIN (15 chars with a valid state code)" }, { status: 422 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.businessIds?.length) {
    return NextResponse.json({ ok: true, alreadyOnboarded: true });
  }

  const business = await Business.create({
    ownerUserId: user._id,
    name: businessName.trim(),
    gstin: g,
    stateCode,
    email,
    financialYear: "2024-25",
  });
  user.businessIds = [business._id];
  await user.save();

  return NextResponse.json({ ok: true, businessId: business._id.toString() });
}
