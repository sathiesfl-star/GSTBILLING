import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { getActiveBusinessId } from "@/lib/session";
import { isLiveMode, cancelRazorpaySubscription } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST() {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectToDatabase();
  const business = await Business.findById(businessId);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }
  if (business.plan === "free") {
    return NextResponse.json({ error: "No active subscription to cancel" }, { status: 422 });
  }

  if (isLiveMode() && business.razorpaySubscriptionId) {
    try {
      await cancelRazorpaySubscription(business.razorpaySubscriptionId, true);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Cancel failed" },
        { status: 502 }
      );
    }
  }

  // Cancelled now; access remains until planExpiry (or immediately in mock).
  business.planStatus = "cancelled";
  if (!isLiveMode()) {
    business.plan = "free";
    business.eInvoiceEnabled = false;
    business.razorpaySubscriptionId = undefined;
  }
  await business.save();

  return NextResponse.json({ ok: true, mode: isLiveMode() ? "live" : "mock" });
}
