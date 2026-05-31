import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { getActiveBusinessId } from "@/lib/session";
import {
  getPlan,
  isLiveMode,
  trialEnd,
  annualEnd,
  createRazorpaySubscription,
  TRIAL_DAYS,
} from "@/lib/billing";

export const runtime = "nodejs";

interface Body {
  tier: string; // starter | pro | business
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

  const plan = getPlan(body.tier);
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan tier" }, { status: 422 });
  }

  await connectToDatabase();
  const business = await Business.findById(businessId);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const now = new Date();
  const trialEnds = trialEnd(now);

  // ---- LIVE: create a real Razorpay subscription; activation confirmed via webhook ----
  if (isLiveMode()) {
    try {
      const startAt = Math.floor(trialEnds.getTime() / 1000); // first charge after the trial
      const sub = await createRazorpaySubscription(plan.envPlanId, {
        notify: true,
        startAt,
        notes: { businessId, tier: plan.tier },
      });
      business.razorpaySubscriptionId = sub.subscriptionId;
      business.plan = plan.tier;
      business.planStatus = "trialing";
      business.trialEndsAt = trialEnds;
      await business.save();

      return NextResponse.json({
        ok: true,
        mode: "live",
        tier: plan.tier,
        subscriptionId: sub.subscriptionId,
        checkoutUrl: sub.shortUrl, // open this to complete payment setup
        keyId: process.env.RAZORPAY_KEY_ID,
        trialDays: TRIAL_DAYS,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Subscription creation failed" },
        { status: 502 }
      );
    }
  }

  // ---- MOCK: no keys — activate immediately with a 14-day trial ----
  business.plan = plan.tier;
  business.planStatus = "trialing";
  business.trialEndsAt = trialEnds;
  business.planExpiry = annualEnd(now);
  business.eInvoiceEnabled = plan.tier === "pro" || plan.tier === "business";
  await business.save();

  return NextResponse.json({
    ok: true,
    mode: "mock",
    tier: plan.tier,
    trialDays: TRIAL_DAYS,
    message: `Activated ${plan.name} (mock) with a ${TRIAL_DAYS}-day trial.`,
  });
}
