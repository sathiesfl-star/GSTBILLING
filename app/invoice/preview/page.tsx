import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveBusinessId } from "@/lib/session";
import { getInvoice, getBusiness } from "@/lib/data";
import { InvoicePrintView, type PrintSeller, type PrintInvoice } from "@/components/InvoicePrintView";

export const dynamic = "force-dynamic";

export default async function InvoicePreviewPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");

  const id = searchParams.id;
  if (!id) return <Empty message="No invoice selected." />;

  const [inv, business] = await Promise.all([getInvoice(businessId, id), getBusiness(businessId)]);
  if (!inv || !business) return <Empty message="Invoice not found." />;

  const addr = business.address ?? {};
  const sellerAddress = [addr.line1, addr.city, addr.pincode].filter(Boolean).join(", ");

  const seller: PrintSeller = {
    name: business.name,
    gstin: business.gstin,
    stateCode: business.stateCode,
    address: sellerAddress || "—",
    phone: business.phone,
    email: business.email,
    bank: business.bankDetails
      ? {
          accountName: business.bankDetails.accountName,
          accountNumber: business.bankDetails.accountNumber,
          ifsc: business.bankDetails.ifsc,
          bankName: business.bankDetails.bankName,
        }
      : null,
  };

  // Map explicitly into the print-view shape (avoids leaking Mongoose-inferred types).
  const printInvoice: PrintInvoice = {
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    taxType: inv.taxType,
    customerSnapshot: {
      name: inv.customerSnapshot?.name ?? "",
      gstin: inv.customerSnapshot?.gstin ?? undefined,
      stateCode: inv.customerSnapshot?.stateCode ?? business.stateCode,
      address: inv.customerSnapshot?.address ?? undefined,
      phone: inv.customerSnapshot?.phone ?? undefined,
    },
    placeOfSupplyStateCode: inv.placeOfSupplyStateCode,
    lineItems: inv.lineItems,
    subtotalPaise: inv.subtotalPaise,
    totalCgstPaise: inv.totalCgstPaise,
    totalSgstPaise: inv.totalSgstPaise,
    totalIgstPaise: inv.totalIgstPaise,
    roundOffPaise: inv.roundOffPaise,
    grandTotalPaise: inv.grandTotalPaise,
    amountInWords: inv.amountInWords,
    einvoice: inv.einvoice
      ? {
          irn: inv.einvoice.irn ?? undefined,
          ackNo: inv.einvoice.ackNo ?? undefined,
          ackDate: inv.einvoice.ackDate ?? undefined,
          signedQrCode: inv.einvoice.signedQrCode ?? undefined,
          status: inv.einvoice.status ?? "none",
        }
      : undefined,
    ewaybill: inv.ewaybill,
  };

  return <InvoicePrintView inv={printInvoice} seller={seller} />;
}

function Empty({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">{message}</h1>
      <Link href="/invoices" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
        Back to invoices
      </Link>
    </main>
  );
}
