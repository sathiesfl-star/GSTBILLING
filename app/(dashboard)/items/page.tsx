import { redirect } from "next/navigation";
import { getActiveBusinessId } from "@/lib/session";
import { listItems } from "@/lib/data";
import { ItemsClient } from "@/components/ItemsClient";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) redirect("/login");
  const items = await listItems(businessId);

  return <ItemsClient items={items} />;
}
