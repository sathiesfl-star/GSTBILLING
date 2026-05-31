/**
 * Subscription billing — Razorpay Subscriptions, with a mock mode for dev.
 *
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET unset  -> mock mode: "subscribe" activates the plan
 *                                                    directly (14-day trial), no external call.
 *   keys set                                      -> live mode: creates a real Razorpay
 *                                                    subscription; activation confirmed via webhook.
 *
 * Razorpay Subscriptions need a Plan created in the dashboard (one plan_id per tier). We read
 * those plan_ids from env (RAZORPAY_PLAN_STARTER/PRO/BUSINESS). Amounts here are display-only
 * (in paise); the actual charge amount lives on the Razorpay Plan.
 */

import crypto from "crypto";
import type { PlanTier } from "@/models/Business";

export interface PlanDef {
  tier: Exclude<PlanTier, "free">;
  name: string;
  pricePaise: number; // annual price, paise
  period: "yearly";
  features: string[];
  envPlanId: string; // env var name holding the Razorpay plan_id
}

/** Annual pricing (plan §8). */
export const PLANS: PlanDef[] = [
  {
    tier: "starter",
    name: "Starter",
    pricePaise: 1499_00,
    period: "yearly",
    envPlanId: "RAZORPAY_PLAN_STARTER",
    features: ["Unlimited invoices", "1 user", "WhatsApp delivery", "PDF + GSTR export"],
  },
  {
    tier: "pro",
    name: "Professional",
    pricePaise: 2999_00,
    period: "yearly",
    envPlanId: "RAZORPAY_PLAN_PRO",
    features: ["Everything in Starter", "3 users", "E-invoice IRN + e-way bill", "Remove BillEasy branding"],
  },
  {
    tier: "business",
    name: "Business",
    pricePaise: 5999_00,
    period: "yearly",
    envPlanId: "RAZORPAY_PLAN_BUSINESS",
    features: ["Everything in Professional", "10 users", "Multi-branch", "CA access", "Priority support"],
  },
];

export const TRIAL_DAYS = 14;

export function getPlan(tier: string): PlanDef | undefined {
  return PLANS.find((p) => p.tier === tier);
}

export function isLiveMode(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function trialEnd(from: Date): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** One year minus a day from `from` (subscription period end for annual). */
export function annualEnd(from: Date): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

// ---------------------------------------------------------------------------
// Razorpay REST (live mode) — no SDK; auth is HTTP Basic key_id:key_secret.
// ---------------------------------------------------------------------------

const RZP_BASE = "https://api.razorpay.com/v1";

function authHeader(): string {
  const token = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

export interface CreatedSubscription {
  subscriptionId: string;
  shortUrl?: string; // Razorpay-hosted checkout link
  status: string;
}

/** Create a Razorpay subscription for a plan (live mode). Trial handled via start_at. */
export async function createRazorpaySubscription(
  planEnvId: string,
  opts: { notify?: boolean; totalCount?: number; startAt?: number; notes?: Record<string, string> }
): Promise<CreatedSubscription> {
  const planId = process.env[planEnvId];
  if (!planId) throw new Error(`Razorpay plan id missing: set ${planEnvId} in .env.local`);

  const res = await fetch(`${RZP_BASE}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      plan_id: planId,
      total_count: opts.totalCount ?? 5, // e.g. 5 yearly cycles
      customer_notify: opts.notify ? 1 : 0,
      start_at: opts.startAt, // unix seconds; used for the 14-day trial
      notes: opts.notes ?? {},
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Razorpay subscription create failed ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as Record<string, any>;
  return { subscriptionId: data.id, shortUrl: data.short_url, status: data.status };
}

export async function cancelRazorpaySubscription(subscriptionId: string, atCycleEnd = true): Promise<void> {
  const res = await fetch(`${RZP_BASE}/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Razorpay cancel failed ${res.status}: ${text.slice(0, 300)}`);
  }
}

/** Verify a Razorpay webhook signature (HMAC-SHA256 of the raw body with the webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
