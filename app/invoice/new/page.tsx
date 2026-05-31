import { redirect } from "next/navigation";
import { getActiveBusinessId } from "@/lib/session";
import { getBuilderData } from "@/lib/data";
import { InvoiceBuilder } from "@/components/InvoiceBuilder";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");

  const { seller, customers, items, nextInvoiceNo } = await getBuilderData(businessId);
  if (!seller) redirect("/login");

  return (
    <InvoiceBuilder
      seller={seller}
      customers={customers}
      items={items}
      nextInvoiceNo={nextInvoiceNo}
    />
  );
}
