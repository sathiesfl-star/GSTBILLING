"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GST_RATES } from "@/lib/gst-calculator";

export interface EditableItem {
  id: string;
  name: string;
  hsnSac: string;
  unit: string;
  defaultRatePaise: number;
  gstRate: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: EditableItem | null; // present => edit mode
}

const UNITS = ["pcs", "kg", "gm", "ltr", "mtr", "box", "pair", "set", "nos", "hr"];

export function AddItemModal({ open, onClose, onSaved, item }: Props) {
  const isEdit = !!item;
  const [name, setName] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [rateRupees, setRateRupees] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setHsnSac(item?.hsnSac ?? "");
    setUnit(item?.unit ?? "pcs");
    setRateRupees(item ? String(item.defaultRatePaise / 100) : "");
    setGstRate(item?.gstRate ?? 18);
    setError("");
  }, [open, item]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(isEdit ? `/api/items/${item!.id}` : "/api/items", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hsnSac, unit, defaultRateRupees: Number(rateRupees) || 0, gstRate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save item");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? "Edit Item" : "Add Item"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bluetooth Speaker"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                HSN/SAC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                placeholder="e.g. 8518"
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Default Rate (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={rateRupees}
                onChange={(e) => setRateRupees(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                GST Rate <span className="text-red-500">*</span>
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {GST_RATES.map((g) => (
                  <option key={g} value={g}>
                    {g}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
