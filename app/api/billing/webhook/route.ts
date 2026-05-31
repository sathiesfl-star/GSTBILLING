import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { verifyWebhookSignature, annualEnd } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Razorpay subscription webhook.
 * Verifies the X-Razorpay-Signature over the RAW body, then updates the business:
 *   subscription.activated  -> planStatus active, set expiry
 *   subscription.charged    -> extend expiry (renewal)
 *   subscription.cancelled  -> planStatus cancelled (access until period end), downgrade after
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = event?.payload?.subscription?.entity;
  const subscriptionId: string | undefined = sub?.id;
  if (!subscriptionId) {
    // Not a subscription event we handle — acknowledge so Razorpay stops retrying.
    return NextResponse.json({ ok: true, ignored: event?.event });
  }

  await connectToDatabase();
  const business = await Business.findOne({ razorpaySubscriptionId: subscriptionId });
  if (!business) {
    return NextResponse.json({ ok: true, ignored: "unknown subscription" });
  }

  const now = new Date();

  switch (event.event) {
    case "subscription.activated":
    case "subscription.authenticated":
      business.planStatus = "active";
      business.planExpiry = annualEnd(now);
      business.eInvoiceEnabled = business.plan === "pro" || business.plan === "business";
      break;
    case "subscription.charged":
      business.planStatus = "active";
      business.planExpiry = annualEnd(now); // extend on each successful charge
      break;
    case "subscription.cancelled":
    case "subscription.completed":
      business.planStatus = "cancelled";
      // Access remains until planExpiry; a scheduled job would downgrade to "free" after.
      break;
    case "subscription.halted":
    case "subscription.paused":
      business.planStatus = "expired";
      break;
    default:
      return NextResponse.json({ ok: true, ignored: event.event });
  }

  await business.save();
  return NextResponse.json({ ok: true, handled: event.event });
}
