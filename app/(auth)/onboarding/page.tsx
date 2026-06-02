"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, gstin }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create business");
      return;
    }
    // Refresh the JWT so it picks up the new businessId, then enter the app.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-7 shadow-sm">
        <div className="text-xl font-bold text-brand">
          Bill<span className="text-slate-900">Easy</span>
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Set up your business</h1>
        <p className="text-sm text-slate-500">One last step before you start billing.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Business name</span>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Stallioni Trading Co."
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">GSTIN</span>
            <input
              required
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              maxLength={15}
              placeholder="33AAPFU0939F1ZV"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase outline-none focus:border-brand"
            />
            <span className="mt-0.5 block text-[11px] text-slate-400">15-char GSTIN — your state code is read from it.</span>
          </label>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create business & continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
