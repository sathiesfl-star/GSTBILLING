import Link from "next/link";
import { redirect } from "next/navigation";
import { IndianRupee, Receipt, AlertCircle, ShieldCheck, ArrowUpRight } from "lucide-react";
import { getActiveBusinessId } from "@/lib/session";
import { dashboardStats, getBusiness } from "@/lib/data";
import { formatRupees } from "@/lib/gst-calculator";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");

  const [stats, business] = await Promise.all([dashboardStats(businessId), getBusiness(businessId)]);

  const cards = [
    { label: `Total Sales (FY ${business?.financialYear ?? ""})`, value: formatRupees(stats.totalSalesPaise), icon: IndianRupee, tint: "text-emerald-600 bg-emerald-50" },
    { label: "GST Collected", value: formatRupees(stats.gstCollectedPaise), icon: Receipt, tint: "text-brand bg-brand-light" },
    { label: "Unpaid / Overdue", value: formatRupees(stats.unpaidPaise), icon: AlertCircle, tint: "text-red-600 bg-red-50" },
    { label: "E-Invoices Generated", value: `${stats.eInvoiceCount} / ${stats.invoiceCount}`, icon: ShieldCheck, tint: "text-violet-600 bg-violet-50" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Financial Year {business?.financialYear} · {business?.name}</p>
        </div>
        <Link href="/invoice/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + New Invoice
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4">
            <div className={`inline-flex rounded-lg p-2 ${c.tint}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-light p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div className="text-sm">
          <span className="font-semibold text-slate-900">E-invoicing is mandatory for businesses above ₹5 crore turnover.</span>{" "}
          <span className="text-slate-600">
            {stats.invoiceCount - stats.eInvoiceCount} invoice(s) don&apos;t have an IRN yet. Generate them to stay compliant.
          </span>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold text-slate-900">Recent invoices</h2>
          <Link href="/invoices" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-center">E-Invoice</th>
                <th className="px-4 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{inv.invoiceNo}</td>
                  <td className="px-4 py-2.5 text-slate-600">{inv.customerName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{inv.date}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatRupees(inv.grandTotalPaise)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {inv.eInvoice ? <span className="text-emerald-600">✓ IRN</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
