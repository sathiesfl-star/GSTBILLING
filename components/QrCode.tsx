"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a real, scannable QR encoding `value` (the e-invoice signed QR string). */
export function QrCode({ value, size = 120 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(""));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400"
      >
        QR…
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="E-invoice QR" className="rounded" />;
}
