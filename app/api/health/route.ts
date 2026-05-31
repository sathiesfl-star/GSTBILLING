import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint — hit /api/health on the deployed site to check config + DB connectivity.
 * Reports presence (not values) of required env vars and whether the DB query works.
 * Safe to remove once deployment is confirmed working.
 */
export async function GET() {
  const env = {
    MONGODB_URI: !!process.env.MONGODB_URI,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    EINVOICE_MODE: process.env.EINVOICE_MODE ?? null,
  };

  let db: { connected: boolean; userCount?: number; error?: string } = { connected: false };
  try {
    await connectToDatabase();
    const userCount = await User.countDocuments();
    db = { connected: true, userCount };
  } catch (err) {
    db = { connected: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({ ok: env.MONGODB_URI && db.connected, env, db });
}
