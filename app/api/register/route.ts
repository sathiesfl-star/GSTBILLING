import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { INDIAN_STATE_CODES } from "@/lib/gst-calculator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, password, businessName, gstin } = body ?? {};

  if (!email || !password || !businessName || !gstin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 422 });
  }

  const g = String(gstin).toUpperCase().trim();
  const stateCode = g.slice(0, 2);
  if (g.length !== 15 || !INDIAN_STATE_CODES.some((s) => s.code === stateCode)) {
    return NextResponse.json({ error: "Invalid GSTIN (must be 15 chars with a valid state code)" }, { status: 422 });
  }

  await connectToDatabase();
  const lower = String(email).toLowerCase().trim();

  if (await User.findOne({ email: lower })) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await User.create({ name, email: lower, passwordHash, provider: "credentials" });

  const business = await Business.create({
    ownerUserId: user._id,
    name: businessName,
    gstin: g,
    stateCode,
    email: lower,
    financialYear: "2024-25",
  });

  user.businessIds = [business._id];
  await user.save();

  return NextResponse.json({ ok: true });
}
