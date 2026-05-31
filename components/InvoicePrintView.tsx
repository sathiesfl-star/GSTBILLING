"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { formatRupees, stateName } from "@/lib/gst-calculator";
import { QrCode } from "@/components/QrCode";

interface Line {
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  ratePaise: number;
  gstRate: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

export interface PrintInvoice {
  invoiceNo: string;
  invoiceDate: string;
  taxType: "intrastate" | "interstate" | "b2c";
  customerSnapshot: { name: string; gstin?: string; stateCode: string; address?: string; phone?: string };
  placeOfSupplyStateCode: string;
  lineItems: Line[];
  subtotalPaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  amountInWords: string;
  einvoice?: { irn?: string; ackNo?: string; ackDate?: string; signedQrCode?: string; status?: string };
  ewaybill?: { ewbNo: string; validUpto: string } | null;
}

export interface PrintSeller {
  name: string;
  gstin: string;
  stateCode: string;
  address: string;
  phone: string;
  email: string;
  bank: { accountName: string; accountNumber: string; ifsc: string; bankName: string } | null;
}

export function InvoicePrintView({ inv, seller }: { inv: PrintInvoice; seller: PrintSeller }) {
  const interstate = inv.taxType === "interstate";
  const c = inv.customerSnapshot;
  const e = inv.einvoice;
  const hasIrn = e?.status === "generated" && !!e.irn;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="no-print sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3">
        <Link href="/invoices" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto my-6 max-w-[800px] bg-white p-8 text-[12px] text-slate-800 shadow print:my-0 print:shadow-none">
        <div className="mb-1 text-center text-lg font-bold tracking-wide text-brand">TAX INVOICE</div>
        <div className="flex justify-between border-y-2 border-brand py-3">
          <div>
            <div className="text-base font-bold text-slate-900">{seller.name}</div>
            <div className="text-slate-600">{seller.address}</div>
            <div className="mt-1">GSTIN: <b>{seller.gstin}</b></div>
            <div>State: {stateName(seller.stateCode)} ({seller.stateCode})</div>
            <div>{seller.phone} · {seller.email}</div>
          </div>
          <div className="text-right">
            {hasIrn ? <QrCode value={e!.signedQrCode || e!.irn!} size={92} /> : <div className="flex h-[92px] w-[92px] items-center justify-center rounded bg-slate-100 text-[9px] text-slate-400">No IRN</div>}
            <div className="mt-1 text-[10px] text-slate-500">e-Invoice QR</div>
          </div>
        </div>

        {hasIrn && (
          <div className="mt-2 rounded bg-slate-50 px-3 py-2 text-[11px]">
            <span className="text-slate-500">IRN:</span> <span className="break-all font-mono">{e!.irn}</span>
            <span className="ml-3 text-slate-500">Ack No:</span> <span className="font-mono">{e!.ackNo ?? "—"}</span>
            <span className="ml-3 text-slate-500">Ack Date:</span> <span className="font-mono">{e!.ackDate ?? "—"}</span>
          </div>
        )}

        {inv.ewaybill && (
          <div className="mt-2 rounded bg-slate-50 px-3 py-2 text-[11px]">
            <span className="text-slate-500">E-Way Bill No:</span> <span className="font-mono">{inv.ewaybill.ewbNo}</span>
            <span className="ml-3 text-slate-500">Valid upto:</span> <span className="font-mono">{inv.ewaybill.validUpto}</span>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded border p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Bill To</div>
            <div className="font-bold text-slate-900">{c.name}</div>
            <div className="text-slate-600">{c.address || "—"}</div>
            <div className="mt-1">GSTIN: <b>{c.gstin ?? "—"}</b></div>
            <div>State: {stateName(c.stateCode)} ({c.stateCode})</div>
            <div>{c.phone || ""}</div>
          </div>
          <div className="rounded border p-3">
            <Row k="Invoice No" v={inv.invoiceNo} />
            <Row k="Invoice Date" v={inv.invoiceDate} />
            <Row k="Place of Supply" v={`${stateName(inv.placeOfSupplyStateCode)} (${inv.placeOfSupplyStateCode})`} />
            <Row k="Tax Type" v={inv.taxType.toUpperCase()} />
          </div>
        </div>

        <table className="mt-3 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-brand text-white">
              <Th>#</Th>
              <Th left>Description</Th>
              <Th>HSN</Th>
              <Th>Qty</Th>
              <Th right>Rate</Th>
              <Th right>Taxable</Th>
              <Th>GST%</Th>
              {interstate ? <Th right>IGST</Th> : (<><Th right>CGST</Th><Th right>SGST</Th></>)}
              <Th right>Amount</Th>
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.map((l, i) => (
              <tr key={i} className={i % 2 ? "bg-slate-50" : ""}>
                <Td center>{i + 1}</Td>
                <Td left>{l.description}</Td>
                <Td center>{l.hsnSac}</Td>
                <Td center>{l.qty} {l.unit}</Td>
                <Td right>{formatRupees(l.ratePaise)}</Td>
                <Td right>{formatRupees(l.taxablePaise)}</Td>
                <Td center>{l.gstRate}%</Td>
                {interstate ? <Td right>{formatRupees(l.igstPaise)}</Td> : (<><Td right>{formatRupees(l.cgstPaise)}</Td><Td right>{formatRupees(l.sgstPaise)}</Td></>)}
                <Td right>{formatRupees(l.totalPaise)}</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-between gap-4">
          <div className="flex-1 rounded border p-3">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Amount in words</div>
            <div className="mt-0.5 font-medium italic">{inv.amountInWords}</div>
          </div>
          <div className="w-64 text-[11px]">
            <Total k="Taxable" v={formatRupees(inv.subtotalPaise)} />
            {interstate ? <Total k="IGST" v={formatRupees(inv.totalIgstPaise)} /> : (<><Total k="CGST" v={formatRupees(inv.totalCgstPaise)} /><Total k="SGST" v={formatRupees(inv.totalSgstPaise)} /></>)}
            <Total k="Round off" v={formatRupees(inv.roundOffPaise)} />
            <div className="mt-1 flex justify-between border-t-2 border-slate-800 pt-1 text-sm font-bold">
              <span>Grand Total</span>
              <span>{formatRupees(inv.grandTotalPaise)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-3 text-[11px]">
          <div>
            {seller.bank && (
              <>
                <div className="mb-1 font-semibold text-slate-900">Bank Details</div>
                <div>A/C Name: {seller.bank.accountName}</div>
                <div>A/C No: {seller.bank.accountNumber}</div>
                <div>IFSC: {seller.bank.ifsc} · {seller.bank.bankName}</div>
              </>
            )}
            <div className="mt-2 font-semibold text-slate-900">Terms &amp; Conditions</div>
            <div className="text-slate-500">Payment due within 15 days. Goods once sold will not be taken back.</div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <div className="text-right">
              <div className="font-semibold text-slate-900">For {seller.name}</div>
              <div className="mt-10 border-t border-slate-400 pt-1 text-slate-500">Authorised Signatory</div>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-[10px] text-slate-400">This is a computer generated invoice.</div>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } @page { size: A4; margin: 12mm; } }`}</style>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-900">{v}</span>
    </div>
  );
}
function Total({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-slate-600">{k}</span>
      <span>{v}</span>
    </div>
  );
}
function Th({ children, left, right }: { children: React.ReactNode; left?: boolean; right?: boolean }) {
  return <th className={`border border-brand-dark px-2 py-1.5 font-semibold ${left ? "text-left" : right ? "text-right" : "text-center"}`}>{children}</th>;
}
function Td({ children, left, right, center }: { children: React.ReactNode; left?: boolean; right?: boolean; center?: boolean }) {
  return <td className={`border border-slate-200 px-2 py-1 ${left ? "text-left" : right ? "text-right" : center ? "text-center" : ""}`}>{children}</td>;
}
