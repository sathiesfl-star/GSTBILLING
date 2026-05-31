/**
 * FakeQR — renders a deterministic QR-ish grid from a string.
 * Prototype only: a real build uses the signed QR returned by the GSP/IRP.
 */
export function FakeQR({ value, size = 120 }: { value: string; size?: number }) {
  const cells = 21; // QR v1 grid
  // Simple deterministic hash -> bit per cell.
  const bits: boolean[] = [];
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < cells * cells; i++) {
    h ^= i;
    h = Math.imul(h, 16777619);
    bits.push((h >>> 7) % 2 === 0);
  }

  const px = size / cells;
  return (
    <svg width={size} height={size} className="rounded bg-white" role="img" aria-label="E-invoice QR (mock)">
      <rect width={size} height={size} fill="#fff" />
      {bits.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={(i % cells) * px}
            y={Math.floor(i / cells) * px}
            width={px}
            height={px}
            fill="#0f172a"
          />
        ) : null
      )}
      {/* finder squares for QR look */}
      {[
        [0, 0],
        [cells - 7, 0],
        [0, cells - 7],
      ].map(([fx, fy], idx) => (
        <g key={idx}>
          <rect x={fx * px} y={fy * px} width={7 * px} height={7 * px} fill="#0f172a" />
          <rect x={(fx + 1) * px} y={(fy + 1) * px} width={5 * px} height={5 * px} fill="#fff" />
          <rect x={(fx + 2) * px} y={(fy + 2) * px} width={3 * px} height={3 * px} fill="#0f172a" />
        </g>
      ))}
    </svg>
  );
}
