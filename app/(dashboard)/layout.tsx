import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/session";
import { getBusiness } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.businessId) redirect("/login");
  const business = await getBusiness(session.user.businessId);

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-60 shrink-0 md:block">
        <div className="fixed h-screen w-60">
          <Sidebar businessName={business?.name ?? "BillEasy"} />
        </div>
      </div>
      <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
