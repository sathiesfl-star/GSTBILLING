"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

interface PlanCard {
  tier: string;
  name: string;
  priceLabel: string;
  features: string[];
}

interface Props {
  plans: PlanCard[];
  currentTier: string;
  trialDays: number;
}

export function PricingPlans({ plans, currentTier, trialDays }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function subscribe(tier: string) {
    setBusy(tier);
    setToast(null);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? "Subscription failed");
        return;
      }
      if (data.mode === "live" && data.checkoutUrl) {
        // Live: send the user to Razorpay's hosted checkout to authorise the mandate.
        window.location.href = data.checkoutUrl;
        return;
      }
      setToast(data.message ?? `Activated ${tier} with a ${trialDays}-day trial.`);
      router.refresh();
    } catch {
      setToast("Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.tier === currentTier;
          const featured = p.tier === "pro";
          return (
            <div
              key={p.tier}
              className={`rounded-xl border bg-white p-5 ${featured ? "border-brand ring-1 ring-brand" : ""}`}
            >
              {featured && (
                <div className="mb-2 inline-block rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand">
                  Most popular
                </div>
              )}
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              <div className="mt-1 text-2xl font-bold text-slate-900">{p.priceLabel}</div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(p.tier)}
                disabled={isCurrent || busy !== null}
                className={`mt-4 w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60 ${
                  isCurrent
                    ? "border bg-slate-50 text-slate-500"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {isCurrent ? "Current plan" : busy === p.tier ? "Starting…" : `Start ${trialDays}-day trial`}
              </button>
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{toast}</div>
      )}
    </div>
  );
}
