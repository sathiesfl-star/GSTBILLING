/**
 * E-Way Bill logic (pure). Like the e-invoice stub, this produces a structurally-correct
 * EWB number + validity + the NIC EWB JSON payload, but is NOT signed by the government NIC
 * EWB system — that requires the same GSP/crypto path as e-invoice (see lib/einvoice/gsp.ts).
 * Swap in a real GSP EWB call later behind this same shape.
 *
 * E-way bill is required when moving goods worth > ₹50,000.
 */

export const TRANSPORT_MODES = [
  { code: "1", label: "Road" },
  { code: "2", label: "Rail" },
  { code: "3", label: "Air" },
  { code: "4", label: "Ship" },
] as const;

export const EWB_THRESHOLD_PAISE = 50000_00; // ₹50,000

export interface TransportDetails {
  mode: string; // "1".."4"
  vehicleNo?: string;
  transporterName?: string;
  transporterGstin?: string;
  distanceKm: number;
}

export function transportModeLabel(code: string): string {
  return TRANSPORT_MODES.find((m) => m.code === code)?.label ?? "Road";
}

/**
 * Validity per NIC rule: for regular cargo, 1 day per 200 km (or part thereof), min 1 day.
 * Returns the expiry Date (end of the validity window from `from`).
 */
export function computeValidUpto(distanceKm: number, from: Date): Date {
  const days = Math.max(1, Math.ceil((Number(distanceKm) || 0) / 200));
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Deterministic 12-digit mock EWB number derived from a seed (real one comes from NIC). */
export function mockEwbNo(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  // 12 digits, NIC EWB numbers are 12-digit
  return (BigInt(h) * 7919n % 900000000000n + 100000000000n).toString();
}

export interface EwbInvoiceData {
  docNo: string;
  docDate: string; // dd/mm/yyyy
  fromGstin: string;
  fromName: string;
  fromStateCode: string;
  fromPincode?: string;
  toGstin?: string;
  toName: string;
  toStateCode: string;
  toPincode?: string;
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  grandTotalPaise: number;
  lines: { description: string; hsnSac: string; qty: number; unit: string; taxablePaise: number; gstRate: number }[];
}

const rupees = (paise: number) => Number((paise / 100).toFixed(2));

/** Build the NIC "Generate EWB" JSON payload (key fields). */
export function buildEwbPayload(inv: EwbInvoiceData, t: TransportDetails) {
  return {
    supplyType: "O", // Outward
    subSupplyType: "1", // Supply
    docType: "INV",
    docNo: inv.docNo,
    docDate: inv.docDate,
    fromGstin: inv.fromGstin,
    fromTrdName: inv.fromName,
    fromStateCode: Number(inv.fromStateCode),
    fromPincode: inv.fromPincode ? Number(inv.fromPincode) : undefined,
    actFromStateCode: Number(inv.fromStateCode),
    toGstin: inv.toGstin ?? "URP",
    toTrdName: inv.toName,
    toStateCode: Number(inv.toStateCode),
    toPincode: inv.toPincode ? Number(inv.toPincode) : undefined,
    actToStateCode: Number(inv.toStateCode),
    totalValue: rupees(inv.subtotalPaise),
    cgstValue: rupees(inv.cgstPaise),
    sgstValue: rupees(inv.sgstPaise),
    igstValue: rupees(inv.igstPaise),
    totInvValue: rupees(inv.grandTotalPaise),
    transMode: t.mode,
    transDistance: String(Number(t.distanceKm) || 0),
    transporterName: t.transporterName || undefined,
    transporterId: t.transporterGstin || undefined,
    vehicleNo: t.vehicleNo || undefined,
    vehicleType: "R", // Regular
    itemList: inv.lines.map((l, i) => ({
      itemNo: i + 1,
      productName: l.description,
      hsnCode: Number(l.hsnSac) || l.hsnSac,
      quantity: l.qty,
      qtyUnit: l.unit.toUpperCase(),
      taxableAmount: rupees(l.taxablePaise),
      gstRate: l.gstRate,
    })),
  };
}
