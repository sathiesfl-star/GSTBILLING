"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, FileText, Truck } from "lucide-react";
import { formatRupees } from "@/lib/gst-calculator";
import { StatusBadge } from "@/components/StatusBadge";
import { EWayBillModal } from "@/components/EWayBillModal";

interface UiInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  taxType: "intrastate" | "interstate" | "b2c";
  taxablePaise: number;
  taxPaise: number;
  grandTotalPaise: number;
  eInvoice: boolean;
  eWayBill: boolean;
  whatsappSent: boolean;
  status: "paid" | "sent" | "draft" | "overdue";
}

const EWB_THRESHOLD_PAISE = 50000_00;

export function InvoicesClient({ invoices }: { invoices: UiInvoice[] }) {
  const router = useRouter();
  const [ewbFor, setEwbFor] = useState<UiInvoice | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} invoices</p>
        </div>
        <Link href="/invoice/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + New Invoice
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Invoice No</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-center">E-Invoice</th>
                <th className="px-4 py-2.5 text-center">E-Way Bill</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No invoices yet. Click “New Invoice” to create one.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const ewbEligible = inv.grandTotalPaise > EWB_THRESHOLD_PAISE;
                return (
                  <tr key={inv.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.customerName}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.date}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                        {inv.taxType === "interstate" ? "IGST" : inv.taxType === "b2c" ? "B2C" : "CGST/SGST"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatRupees(inv.grandTotalPaise)}</td>
                    <td className="px-4 py-3 text-center">
                      {inv.eInvoice ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">✓ IRN</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.eWayBill ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">✓ EWB</span>
                      ) : ewbEligible ? (
                        <button onClick={() => setEwbFor(inv)} className="text-xs font-medium text-brand hover:underline">
                          Generate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300" title="Only for consignments above ₹50,000">n/a</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <Link href={`/invoice/preview?id=${inv.id}`} title="Preview PDF" className="hover:text-brand">
                          <FileText className="h-4 w-4" />
                        </Link>
                        {ewbEligible && (
                          <button onClick={() => setEwbFor(inv)} title="E-way bill" className="hover:text-brand">
                            <Truck className="h-4 w-4" />
                          </button>
                        )}
                        <span title={inv.whatsappSent ? "Sent on WhatsApp" : "Not sent"} className={inv.whatsappSent ? "text-emerald-500" : ""}>
                          <MessageCircle className="h-4 w-4" />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EWayBillModal
        open={!!ewbFor}
        invoiceId={ewbFor?.id ?? null}
        invoiceNo={ewbFor?.invoiceNo ?? ""}
        onClose={() => setEwbFor(null)}
        onGenerated={() => router.refresh()}
      />
    </div>
  );
}
