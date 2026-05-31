"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { stateName, validateGSTIN } from "@/lib/gst-calculator";
import { AddCustomerModal, type EditableCustomer } from "@/components/AddCustomerModal";

export function CustomersClient({ customers }: { customers: EditableCustomer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditableCustomer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(c: EditableCustomer) {
    setEditing(c);
    setOpen(true);
  }

  async function remove(c: EditableCustomer) {
    if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{customers.length} customers</p>
        </div>
        <button onClick={openAdd} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + Add Customer
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">GSTIN</th>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No customers yet. Click “Add Customer” to create one.
                  </td>
                </tr>
              )}
              {customers.map((c) => {
                const gstinOk = c.gstin ? validateGSTIN(c.gstin).valid : false;
                return (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.address}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.gstin ? (
                        <span className="inline-flex items-center gap-1">
                          {c.gstin}
                          <span title={gstinOk ? "Valid checksum" : "Invalid"} className={gstinOk ? "text-emerald-500" : "text-red-500"}>
                            {gstinOk ? "✓" : "✗"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{stateName(c.stateCode)} ({c.stateCode})</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${c.gstin ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                        {c.gstin ? "B2B" : "B2C"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button onClick={() => openEdit(c)} title="Edit" className="hover:text-brand">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(c)} disabled={busyId === c.id} title="Delete" className="hover:text-red-500 disabled:opacity-40">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddCustomerModal
        open={open}
        customer={editing}
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
