/**
 * Plan limits / entitlements (server-side enforcement).
 * Mirrors the pricing in lib/billing.ts (plan §8):
 *   free     — 20 invoices/month, no e-invoice, no e-way bill
 *   starter  — unlimited invoices, no e-invoice
 *   pro      — unlimited + e-invoice + e-way bill
 *   business — unlimited + e-invoice + e-way bill (+ more users/branches, not enforced here)
 */
import { connectToDatabase } from "@/lib/mongodb";
import { Invoice } from "@/models/Invoice";
import type { PlanTier } from "@/models/Business";

export interface PlanLimits {
  monthlyInvoices: number | null; // null = unlimited
  eInvoice: boolean;
  eWayBill: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { monthlyInvoices: 20, eInvoice: false, eWayBill: false },
  starter: { monthlyInvoices: null, eInvoice: false, eWayBill: false },
  pro: { monthlyInvoices: null, eInvoice: true, eWayBill: true },
  business: { monthlyInvoices: null, eInvoice: true, eWayBill: true },
};

export function limitsFor(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/** Count invoices created this calendar month for a business. */
export async function invoicesThisMonth(businessId: string): Promise<number> {
  await connectToDatabase();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Invoice.countDocuments({ businessId, createdAt: { $gte: start, $lt: end } });
}

/**
 * Check whether a business can create another invoice this month.
 * Returns { allowed, used, limit }.
 */
export async function canCreateInvoice(
  businessId: string,
  plan: PlanTier
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const limit = limitsFor(plan).monthlyInvoices;
  if (limit === null) return { allowed: true, used: 0, limit: null };
  const used = await invoicesThisMonth(businessId);
  return { allowed: used < limit, used, limit };
}

/** Upgrade message for a gated feature. */
export function upgradeMessage(feature: "einvoice" | "ewaybill" | "invoices"): string {
  switch (feature) {
    case "einvoice":
      return "E-invoice (IRN) generation is available on the Professional plan and above. Upgrade in Settings.";
    case "ewaybill":
      return "E-way bill generation is available on the Professional plan and above. Upgrade in Settings.";
    case "invoices":
      return "You've reached your Free plan limit of 20 invoices this month. Upgrade in Settings for unlimited invoices.";
  }
}
