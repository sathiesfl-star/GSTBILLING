"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShieldCheck, FileText, MessageCircle, Check, X } from "lucide-react";
import {
  calculateInvoice,
  formatRupees,
  stateName,
  GST_RATES,
  type InvoiceLineInput,
} from "@/lib/gst-calculator";
import { QrCode } from "@/components/QrCode";

export interface BuilderCustomer {
  id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  address: string;
  phone: string;
}
export interface BuilderItem {
  id: string;
  name: string;
  hsnSac: string;
  unit: string;
  defaultRatePaise: number;
  gstRate: number;
}
export interface BuilderProps {
  seller: { name: string; gstin: string; stateCode: string };
  customers: BuilderCustomer[];
  items: BuilderItem[];
  nextInvoiceNo: string;
}

interface Row {
  key: number;
  itemId: string;
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  rateRupees: number;
  gstRate: number;
}

let rowKey = 1;
function blankRow(): Row {
  return { key: rowKey++, itemId: "", description: "", hsnSac: "", qty: 1, unit: "pcs", rateRupees: 0, gstRate: 18 };
}

interface EInvoice {
  mode: "stub" | "live";
  irn: string;
  ackNo: string;
  ackDt: string;
  signedQrString: string;
  payload: object;
  signed: boolean;
}

export function InvoiceBuilder({ seller, customers, items, nextInvoiceNo }: BuilderProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [einvoice, setEinvoice] = useState<EInvoice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [saving, setSaving] = useState<null | "draft" | "send" | "preview">(null);
  const [toast, setToast] = useState<string | null>(null);

  const customer = customers.find((c) => c.id === customerId);

  const totals = useMemo(() => {
    const lineInputs: InvoiceLineInput[] = rows.map((r) => ({
      description: r.description || "Item",
      hsnSac: r.hsnSac,
      qty: Number(r.qty) || 0,
      unit: r.unit,
      ratePaise: Math.round((Number(r.rateRupees) || 0) * 100),
      gstRate: r.gstRate,
    }));
    return calculateInvoice(lineInputs, seller.stateCode, customer?.stateCode ?? seller.stateCode, customer?.gstin);
  }, [rows, customer, seller.stateCode]);

  const isInterstate = totals.taxType === "interstate";

  function flash(msg: string, ms = 3500) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setEinvoice(null);
  }

  function pickItem(key: number, itemId: string) {
    const it = items.find((i) => i.id === itemId);
    if (!it) return updateRow(key, { itemId: "" });
    updateRow(key, {
      itemId,
      description: it.name,
      hsnSac: it.hsnSac,
      unit: it.unit,
      rateRupees: it.defaultRatePaise / 100,
      gstRate: it.gstRate,
    });
  }

  function linesPayload() {
    return rows
      .filter((r) => r.description.trim() || r.rateRupees > 0)
      .map((r) => ({
        description: r.description,
        hsnSac: r.hsnSac,
        qty: r.qty,
        unit: r.unit,
        rateRupees: r.rateRupees,
        gstRate: r.gstRate,
      }));
  }

  async function generateEInvoice() {
    if (!customer) return flash("Select a customer first.");
    if (!customer.gstin) {
      return flash("E-invoice (IRN) applies to B2B invoices only. Select a customer with a GSTIN.");
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/einvoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, docNo: nextInvoiceNo, docDate: today(), lines: linesPayload() }),
      });
      const data = await res.json();
      if (!res.ok) flash(data.error ?? "E-invoice generation failed");
      else setEinvoice(data as EInvoice);
    } catch {
      flash("Network error contacting e-invoice service");
    } finally {
      setGenerating(false);
    }
  }

  // mode controls the saving spinner + invoice status; `goPreview` routes to the
  // saved invoice's printable PDF (so a generated IRN shows on it).
  async function saveInvoice(mode: "draft" | "send" | "preview") {
    if (!customer) return flash("Select a customer first.");
    const lines = linesPayload();
    if (!lines.length) return flash("Add at least one line item.");
    const goPreview = mode === "send" || mode === "preview";
    setSaving(mode);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          lines,
          status: mode === "send" ? "finalized" : "draft",
          einvoice: einvoice
            ? { irn: einvoice.irn, ackNo: einvoice.ackNo, ackDt: einvoice.ackDt, signedQrString: einvoice.signedQrString }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Failed to save invoice");
        return;
      }
      flash(`${data.invoice.invoiceNo} saved ✓`);
      router.push(goPreview ? `/invoice/preview?id=${data.invoice.id}` : "/invoices");
      router.refresh();
    } catch {
      flash("Network error saving invoice");
    } finally {
      setSaving(null);
    }
  }

  if (!customers.length) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">No customers yet</h1>
        <p className="mt-2 text-slate-600">Add a customer before creating an invoice.</p>
        <Link href="/customers" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Go to Customers
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-lg font-bold text-brand">
            Bill<span className="text-slate-900">Easy</span>
          </Link>
          <span className="hidden text-sm text-slate-400 sm:inline">/ New Invoice</span>
        </div>
        <div className="text-sm font-medium text-slate-600">{nextInvoiceNo}</div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <label className="text-xs font-semibold uppercase text-slate-500">Bill To</label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setEinvoice(null);
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-3 space-y-0.5 text-sm text-slate-600">
              <div>{customer?.address || "—"}</div>
              <div>
                GSTIN: <span className="font-medium text-slate-900">{customer?.gstin ?? "— (B2C)"}</span>
              </div>
              <div>State: {customer ? `${stateName(customer.stateCode)} (${customer.stateCode})` : "—"}</div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <label className="text-xs font-semibold uppercase text-slate-500">Supply Details</label>
            <div className="mt-2 space-y-1 text-sm">
              <Detail label="Seller state" value={`${stateName(seller.stateCode)} (${seller.stateCode})`} />
              <Detail label="Place of supply" value={customer ? `${stateName(customer.stateCode)} (${customer.stateCode})` : "—"} />
              <Detail
                label="Tax type"
                value={
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${isInterstate ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {totals.taxType.toUpperCase()} {isInterstate ? "(IGST)" : "(CGST + SGST)"}
                  </span>
                }
              />
              <Detail label="Invoice date" value={today()} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">HSN</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate ₹</th>
                  <th className="px-3 py-2 text-right">GST%</th>
                  <th className="px-3 py-2 text-right">Taxable</th>
                  <th className="px-3 py-2 text-right">{isInterstate ? "IGST" : "CGST"}</th>
                  {!isInterstate && <th className="px-3 py-2 text-right">SGST</th>}
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const line = totals.lines[idx];
                  return (
                    <tr key={r.key} className="border-t">
                      <td className="px-3 py-2">
                        <select value={r.itemId} onChange={(e) => pickItem(r.key, e.target.value)} className="w-44 rounded border px-2 py-1">
                          <option value="">— select —</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{r.hsnSac || "—"}</td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} value={r.qty} onChange={(e) => updateRow(r.key, { qty: Number(e.target.value) })} className="w-16 rounded border px-2 py-1 text-right" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} value={r.rateRupees} onChange={(e) => updateRow(r.key, { rateRupees: Number(e.target.value) })} className="w-24 rounded border px-2 py-1 text-right" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={r.gstRate} onChange={(e) => updateRow(r.key, { gstRate: Number(e.target.value) })} className="w-16 rounded border px-2 py-1 text-right">
                          {GST_RATES.map((g) => (
                            <option key={g} value={g}>
                              {g}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">{formatRupees(line?.taxablePaise ?? 0)}</td>
                      <td className="px-3 py-2 text-right">{formatRupees(isInterstate ? line?.igstPaise ?? 0 : line?.cgstPaise ?? 0)}</td>
                      {!isInterstate && <td className="px-3 py-2 text-right">{formatRupees(line?.sgstPaise ?? 0)}</td>}
                      <td className="px-3 py-2 text-right font-medium">{formatRupees(line?.totalPaise ?? 0)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs));
                            setEinvoice(null);
                          }}
                          className="text-slate-400 hover:text-red-500"
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={() => setRows((rs) => [...rs, blankRow()])} className="flex w-full items-center justify-center gap-2 border-t py-3 text-sm font-medium text-brand hover:bg-brand-light">
            <Plus className="h-4 w-4" /> Add row
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand" />
              <h3 className="font-semibold text-slate-900">GST E-Invoice (IRN)</h3>
            </div>
            {!einvoice ? (
              <>
                <p className="mt-2 text-sm text-slate-600">Required for B2B invoices under the GST e-invoice mandate. Computes the real NIC IRN hash and builds the GST e-invoice JSON.</p>
                <button onClick={generateEInvoice} disabled={generating} className="mt-3 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                  {generating ? "Generating IRN…" : "⚡ Generate E-Invoice (IRN + QR)"}
                </button>
              </>
            ) : (
              <>
                <div className="mt-3 flex gap-4">
                  <QrCode value={einvoice.signedQrString} size={104} />
                  <div className="min-w-0 text-xs">
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                        <Check className="h-3 w-3" /> IRN generated
                      </span>
                      <span className={`rounded px-2 py-0.5 font-semibold ${einvoice.signed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {einvoice.mode === "live" ? "IRP-signed" : "STUB · not IRP-signed"}
                      </span>
                    </div>
                    <Mono label="IRN" value={einvoice.irn} />
                    <Mono label="Ack No" value={einvoice.ackNo} />
                    <Mono label="Ack Date" value={einvoice.ackDt} />
                  </div>
                </div>
                <button onClick={() => setShowJson((v) => !v)} className="mt-2 text-xs font-medium text-brand hover:underline">
                  {showJson ? "Hide" : "View"} e-invoice JSON (NIC v1.1)
                </button>
                {showJson && (
                  <pre className="mt-2 max-h-56 overflow-auto rounded bg-slate-900 p-3 text-[10px] leading-relaxed text-slate-100">{JSON.stringify(einvoice.payload, null, 2)}</pre>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <SummaryRow label="Taxable amount" value={formatRupees(totals.subtotalPaise)} />
            {isInterstate ? (
              <SummaryRow label="IGST" value={formatRupees(totals.totalIgstPaise)} />
            ) : (
              <>
                <SummaryRow label="CGST" value={formatRupees(totals.totalCgstPaise)} />
                <SummaryRow label="SGST" value={formatRupees(totals.totalSgstPaise)} />
              </>
            )}
            <SummaryRow label="Round off" value={formatRupees(totals.roundOffPaise)} />
            <div className="my-2 border-t" />
            <SummaryRow label="Grand Total" value={formatRupees(totals.grandTotalPaise)} bold />
            <p className="mt-2 text-xs italic text-slate-500">{totals.amountInWords}</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
          <button onClick={() => saveInvoice("draft")} disabled={!!saving} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60">
            {saving === "draft" ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={() => saveInvoice("preview")} disabled={!!saving} className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60">
            <FileText className="h-4 w-4" /> {saving === "preview" ? "Saving…" : "Save & Preview PDF"}
          </button>
          <button onClick={() => flash("WhatsApp delivery activates once a provider is connected.")} className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <MessageCircle className="h-4 w-4" /> Send WhatsApp
          </button>
          <button onClick={() => saveInvoice("send")} disabled={!!saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {saving === "send" ? "Saving…" : "Save & Finalize"}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            <X className="h-4 w-4 opacity-70" />
          </button>
        </div>
      )}
    </main>
  );
}

function today(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "text-base font-bold text-slate-900" : "text-sm text-slate-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Mono({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1">
      <div className="text-slate-400">{label}</div>
      <div className="break-all font-mono text-[11px] text-slate-700">{value}</div>
    </div>
  );
}
