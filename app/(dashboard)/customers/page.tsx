import { redirect } from "next/navigation";
import { getActiveBusinessId } from "@/lib/session";
import { listCustomers } from "@/lib/data";
import { CustomersClient } from "@/components/CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");
  const customers = await listCustomers(businessId);

  return <CustomersClient customers={customers} />;
}
