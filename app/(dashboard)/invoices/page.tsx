import { redirect } from "next/navigation";
import { getActiveBusinessId } from "@/lib/session";
import { listInvoices } from "@/lib/data";
import { InvoicesClient } from "@/components/InvoicesClient";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");
  const invoices = await listInvoices(businessId);

  return <InvoicesClient invoices={invoices} />;
}
