import { redirect } from "next/navigation";
import { getActiveBusinessId } from "@/lib/session";
import { getBusiness, dashboardStats } from "@/lib/data";
import { stateName, validateGSTIN, formatRupees } from "@/lib/gst-calculator";
import { PLANS, isLiveMode, TRIAL_DAYS } from "@/lib/billing";
import { limitsFor, invoicesThisMonth } from "@/lib/plan-limits";
import { PricingPlans } from "@/components/PricingPlans";
import { CancelSubscription } from "@/components/CancelSubscription";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter · ₹1,499/yr",
  pro: "Professional · ₹2,999/yr",
  business: "Business · ₹5,999/yr",
};

export default async function SettingsPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");

  const [business, stats] = await Promise.all([getBusiness(businessId), dashboardStats(businessId)]);
  if (!business) redirect("/login");

  const gstin = validateGSTIN(business.gstin);
  const addr = business.address ?? {};
  const fullAddress = [addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(", ") || "—";
  const bank = business.bankDetails;
  const onPaidPlan = business.plan !== "free";

  const limits = limitsFor(business.plan);
  const monthlyUsed = await invoicesThisMonth(businessId);
  const invoiceUsageLabel =
    limits.monthlyInvoices === null ? "Unlimited" : `${monthlyUsed} / ${limits.monthlyInvoices} this month`;

  const planCards = PLANS.map((p) => ({
    tier: p.tier,
    name: p.name,
    priceLabel: `${formatRupees(p.pricePaise)}/yr`,
    features: p.features,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Current plan + usage */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Subscription</h2>
            <p className="text-sm text-slate-500">
              {business.planStatus === "trialing" && business.trialEndsAt
                ? `Trial — ends ${business.trialEndsAt}`
                : business.planStatus === "active" && business.planExpiry
                  ? `Active — renews ${business.planExpiry}`
                  : business.planStatus === "cancelled"
                    ? `Cancelled — access until ${business.planExpiry ?? "period end"}`
                    : "Current plan & usage"}
            </p>
          </div>
          <span className="rounded-full bg-brand-light px-3 py-1 text-sm font-semibold text-brand">
            {PLAN_LABELS[business.plan] ?? business.plan}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Stat label="Invoices" value={`${stats.invoiceCount}`} />
          <Stat label="E-invoices generated" value={`${stats.eInvoiceCount}`} />
          <Stat label="E-invoice" value={business.eInvoiceEnabled ? "Enabled" : "Off"} />
        </div>
        {onPaidPlan && (
          <div className="mt-4">
            <CancelSubscription />
          </div>
        )}
        {!isLiveMode() && (
          <p className="mt-3 text-xs text-amber-600">
            ⚠️ Billing is in mock mode — subscribing activates instantly without a real charge.
            Add Razorpay keys to go live (see docs/razorpay-setup.md).
          </p>
        )}
      </div>

      {/* Plans */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold text-slate-900">
          {onPaidPlan ? "Change plan" : "Choose a plan"}
        </h2>
        <p className="mb-4 text-sm text-slate-500">All plans include a {TRIAL_DAYS}-day free trial. Billed annually.</p>
        <PricingPlans plans={planCards} currentTier={business.plan} trialDays={TRIAL_DAYS} />
      </div>

      {/* Business profile */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Business Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
          <Field label="Business name" value={business.name} />
          <Field label="GSTIN" value={`${business.gstin} ${gstin.valid ? "✓" : "✗"}`} />
          <Field label="State" value={`${stateName(business.stateCode)} (${business.stateCode})`} />
          <Field label="PAN" value={gstin.panNumber || "—"} />
          <Field label="Phone" value={business.phone || "—"} />
          <Field label="Email" value={business.email || "—"} />
          <Field label="Financial Year" value={business.financialYear} />
          <Field label="Address" value={fullAddress} full />
        </div>
      </div>

      {/* Bank details */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Bank Details (on invoices)</h2>
        {bank ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            <Field label="Account name" value={bank.accountName} />
            <Field label="Account number" value={bank.accountNumber} />
            <Field label="IFSC" value={bank.ifsc} />
            <Field label="Bank" value={bank.bankName} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No bank details added yet.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-0.5 text-slate-900">{value}</div>
    </div>
  );
}
