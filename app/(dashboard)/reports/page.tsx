import { redirect } from "next/navigation";
import { getActiveBusinessId } from "@/lib/session";
import { getGstrData } from "@/lib/data";
import { formatRupees } from "@/lib/gst-calculator";
import { GstrExport } from "@/components/GstrExport";
import { PeriodSelector } from "@/components/PeriodSelector";

export const dynamic = "force-dynamic";

function prettyPeriod(p: string): string {
  const MM = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const m = Number(p.slice(0, 2));
  const y = p.slice(2);
  return `${MM[m] ?? p} ${y}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");

  const data = await getGstrData(businessId, searchParams.period);
  if (!data) redirect("/login");

  const { period, availablePeriods, gstr1, gstr3b, summary } = data;
  const g3b = gstr3b.sup_details;
  const toPaise = (r: number) => Math.round(r * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GST Reports</h1>
          <p className="text-sm text-slate-500">
            GSTR-1 / GSTR-3B for {prettyPeriod(period)} (period {period})
          </p>
        </div>
        <PeriodSelector period={period} available={availablePeriods} />
      </div>

      {summary.invoiceCount === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
          No filed invoices for this period yet. Finalize an invoice to populate your GST returns.
        </div>
      ) : (
        <>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-semibold text-slate-900">GSTR-1 — Outward supplies</h2>
            <GstrExport period={period} gstr1={gstr1} gstr3b={gstr3b} summary={summary} />
          </section>

          <section className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-semibold text-slate-900">GSTR-3B — Summary (3.1 Outward supplies)</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Nature of supply</th>
                    <th className="py-2 text-right">Taxable value</th>
                    <th className="py-2 text-right">IGST</th>
                    <th className="py-2 text-right">CGST</th>
                    <th className="py-2 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2.5">3.1(a) Outward taxable supplies</td>
                    <td className="py-2.5 text-right">{formatRupees(toPaise(g3b.osup_det.txval))}</td>
                    <td className="py-2.5 text-right">{formatRupees(toPaise(g3b.osup_det.iamt))}</td>
                    <td className="py-2.5 text-right">{formatRupees(toPaise(g3b.osup_det.camt))}</td>
                    <td className="py-2.5 text-right">{formatRupees(toPaise(g3b.osup_det.samt))}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">3.1(b) Zero rated supplies</td>
                    <td className="py-2.5 text-right">{formatRupees(0)}</td>
                    <td className="py-2.5 text-right">{formatRupees(0)}</td>
                    <td className="py-2.5 text-right">—</td>
                    <td className="py-2.5 text-right">—</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">3.1(c) Nil rated / exempted</td>
                    <td className="py-2.5 text-right">{formatRupees(0)}</td>
                    <td className="py-2.5 text-right">—</td>
                    <td className="py-2.5 text-right">—</td>
                    <td className="py-2.5 text-right">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            💡 Upload the downloaded GSTR-1 JSON directly on <b>gstn.gov.in</b> → Returns → GSTR-1 → Prepare Offline → Upload.
          </div>
        </>
      )}
    </div>
  );
}
