"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MM = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function label(p: string): string {
  return `${MM[Number(p.slice(0, 2))] ?? p} ${p.slice(2)}`;
}

/** Period dropdown for the Reports page. Drives the ?period= query param. */
export function PeriodSelector({ period, available }: { period: string; available: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("period", next);
    router.push(`/reports?${sp.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-slate-600">Period</span>
      <select
        value={period}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {available.map((p) => (
          <option key={p} value={p}>
            {label(p)}
          </option>
        ))}
      </select>
    </label>
  );
}
