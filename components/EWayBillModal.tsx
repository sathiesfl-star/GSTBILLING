"use client";

import { useState } from "react";
import { X, Truck, Check } from "lucide-react";
import { TRANSPORT_MODES } from "@/lib/ewaybill";

interface Props {
  open: boolean;
  invoiceId: string | null;
  invoiceNo: string;
  onClose: () => void;
  onGenerated: () => void;
}

interface Result {
  ewbNo: string;
  validUptoStr: string;
  distanceKm: number;
}

export function EWayBillModal({ open, invoiceId, invoiceNo, onClose, onGenerated }: Props) {
  const [mode, setMode] = useState("1");
  const [vehicleNo, setVehicleNo] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [transporterGstin, setTransporterGstin] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ewaybill/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, mode, vehicleNo, transporterName, transporterGstin, distanceKm: Number(distanceKm) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate e-way bill");
        return;
      }
      setResult({ ewbNo: data.ewbNo, validUptoStr: data.validUptoStr, distanceKm: data.distanceKm });
      onGenerated();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setResult(null);
    setError("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={close}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Truck className="h-5 w-5 text-brand" /> E-Way Bill — {invoiceNo}
          </h2>
          <button onClick={close} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              <Check className="h-3 w-3" /> E-way bill generated
            </div>
            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">STUB · not NIC-signed</span>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <Field k="EWB No" v={result.ewbNo} mono />
              <Field k="Valid upto" v={result.validUptoStr} />
              <Field k="Distance" v={`${result.distanceKm} km`} />
            </div>
            <button onClick={close} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Transport Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none">
                  {TRANSPORT_MODES.map((m) => (
                    <option key={m.code} value={m.code}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Distance (km) *</label>
                <input type="number" min={0} required value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="e.g. 150" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Vehicle Number</label>
              <input type="text" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="e.g. TN01AB1234" className="w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase focus:border-brand focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Transporter</label>
                <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} placeholder="Name (optional)" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Transporter GSTIN</label>
                <input type="text" maxLength={15} value={transporterGstin} onChange={(e) => setTransporterGstin(e.target.value.toUpperCase())} placeholder="optional" className="w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase focus:border-brand focus:outline-none" />
              </div>
            </div>

            <p className="text-xs text-slate-400">Validity is auto-calculated: 1 day per 200 km (min 1 day).</p>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {saving ? "Generating…" : "Generate E-Way Bill"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className={`font-medium text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>{v}</span>
    </div>
  );
}
