export type BadgeStatus = "paid" | "sent" | "draft" | "overdue";

const STYLES: Record<BadgeStatus, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  sent: "bg-blue-100 text-blue-800",
  draft: "bg-slate-100 text-slate-600",
  overdue: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
