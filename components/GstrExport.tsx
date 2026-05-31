"use client";

import { useState } from "react";
import { Download, Eye, FileJson } from "lucide-react";
import { formatRupees } from "@/lib/gst-calculator";

interface GstrSummary {
  invoiceCount: number;
  b2bInvoices: number;
  b2cInvoices: number;
  b2bParties: number;
  b2csRecords: number;
  totalTaxablePaise: number;
  totalTaxPaise: number;
  totalInvoiceValuePaise: number;
}

interface Props {
  period: string;
  gstr1: { gstin: string; b2b: unknown[]; b2cl: unknown[]; b2cs: unknown[] } & Record<string, unknown>;
  gstr3b: { gstin: string } & Record<string, unknown>;
  summary: GstrSummary;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function GstrExport({ period, gstr1, gstr3b, summary }: Props) {
  const [preview, setPreview] = useState<"none" | "gstr1" | "gstr3b">("none");

  const PERIOD = period;

  return (
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => downloadJson(`GSTR1_${gstr1.gstin}_${PERIOD}.json`, gstr1)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Download className="h-4 w-4" /> Download GSTR-1 JSON
        </button>
        <button
          onClick={() => downloadJson(`GSTR3B_${gstr3b.gstin}_${PERIOD}.json`, gstr3b)}
          className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Download GSTR-3B JSON
        </button>
        <button
          onClick={() => setPreview(preview === "gstr1" ? "none" : "gstr1")}
          className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <Eye className="h-4 w-4" /> {preview === "gstr1" ? "Hide" : "Preview"} GSTR-1
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Invoices filed" value={String(summary.invoiceCount)} />
        <Stat label="B2B parties" value={String(summary.b2bParties)} />
        <Stat label="Taxable value" value={formatRupees(summary.totalTaxablePaise)} />
        <Stat label="Total GST" value={formatRupees(summary.totalTaxPaise)} />
      </div>

      {/* Classification breakdown */}
      <div className="rounded-xl border bg-white p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <FileJson className="h-4 w-4 text-brand" /> GSTR-1 classification (period {PERIOD})
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Pill label="B2B invoices" value={summary.b2bInvoices} hint={`${gstr1.b2b.length} party group(s)`} />
          <Pill label="B2C invoices" value={summary.b2cInvoices} hint={`${gstr1.b2cs.length} b2cs record(s)`} />
          <Pill label="B2C Large" value={gstr1.b2cl.length} hint="> ₹2.5L interstate" />
        </div>
      </div>

      {/* JSON preview */}
      {preview === "gstr1" && (
        <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">
          {JSON.stringify(gstr1, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Pill({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-slate-600">{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}</span>
      </div>
      <div className="text-[11px] text-slate-400">{hint}</div>
    </div>
  );
}
