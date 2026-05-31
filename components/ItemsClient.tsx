"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { formatRupees } from "@/lib/gst-calculator";
import { AddItemModal, type EditableItem } from "@/components/AddItemModal";

export function ItemsClient({ items }: { items: EditableItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditableItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(it: EditableItem) {
    setEditing(it);
    setOpen(true);
  }

  async function remove(it: EditableItem) {
    if (!confirm(`Delete item "${it.name}"? This cannot be undone.`)) return;
    setBusyId(it.id);
    try {
      const res = await fetch(`/api/items/${it.id}`, { method: "DELETE" });
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
          <h1 className="text-2xl font-bold text-slate-900">Items</h1>
          <p className="text-sm text-slate-500">{items.length} items · HSN/SAC master</p>
        </div>
        <button onClick={openAdd} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + Add Item
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">HSN/SAC</th>
                <th className="px-4 py-2.5">Unit</th>
                <th className="px-4 py-2.5 text-right">Default Rate</th>
                <th className="px-4 py-2.5 text-right">GST Rate</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No items yet. Click “Add Item” to create one.
                  </td>
                </tr>
              )}
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-slate-900">{it.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{it.hsnSac}</td>
                  <td className="px-4 py-3 text-slate-600">{it.unit}</td>
                  <td className="px-4 py-3 text-right">{formatRupees(it.defaultRatePaise)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">{it.gstRate}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <button onClick={() => openEdit(it)} title="Edit" className="hover:text-brand">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(it)} disabled={busyId === it.id} title="Delete" className="hover:text-red-500 disabled:opacity-40">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddItemModal open={open} item={editing} onClose={() => setOpen(false)} onSaved={() => router.refresh()} />
    </div>
  );
}
