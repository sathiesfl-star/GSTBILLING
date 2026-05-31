/**
 * GSP (GST Suvidha Provider) adapter — the pluggable boundary between BillEasy and
 * whoever actually talks to the government IRP.
 *
 *   EINVOICE_MODE=stub     (default) -> StubGspAdapter: real IRN + payload + QR *content*,
 *                                       but the QR is NOT IRP-signed (honest placeholder).
 *   EINVOICE_MODE=cleartax            -> ClearTaxGspAdapter: 2-step auth + generate-IRN against
 *                                       ClearTax's e-invoicing API; returns a genuinely IRP-signed IRN + QR.
 *   EINVOICE_MODE=rest                -> RestGspAdapter: generic single-POST relay (other GSPs).
 *
 * Why a GSP and not the NIC API directly? NIC's API requires per-request RSA + AES (SEK)
 * encryption and whitelisted GSP credentials. GSPs abstract that behind a simple REST call,
 * which is how virtually all billing SaaS integrate. The interface below is identical either
 * way, so swapping stub -> live is a config change, not a code change.
 */

import { computeIrn, type DocType } from "./irn";
import { buildEInvoicePayload, buildQrPayload, type EInvoiceInput } from "./payload";

export interface EInvoiceResult {
  mode: "stub" | "live";
  irn: string;
  ackNo: string;
  ackDt: string; // yyyy-MM-dd HH:mm:ss
  signedQrString: string; // what gets encoded into the QR image
  qrPayload: object;
  payload: object; // the NIC v1.1 JSON sent to the IRP
  signed: boolean; // true only when IRP-signed (live)
}

export interface GspAdapter {
  generateIrn(input: EInvoiceInput): Promise<EInvoiceResult>;
}

function base64url(s: string): string {
  return Buffer.from(s)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function nowStamp(): string {
  // "yyyy-MM-dd HH:mm:ss"
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// ---------------------------------------------------------------------------
// Stub adapter — real artifacts, unsigned QR.
// ---------------------------------------------------------------------------

export class StubGspAdapter implements GspAdapter {
  async generateIrn(input: EInvoiceInput): Promise<EInvoiceResult> {
    const docDate = parseDdMmYyyy(input.docDate);
    const irn = await computeIrn(input.seller.gstin ?? "", docDate, input.docType, input.docNo);
    const ackDt = nowStamp();
    const payload = buildEInvoicePayload(input);
    const qrPayload = buildQrPayload(input, irn, ackDt);

    // Deterministic mock Ack No (15 digits) derived from the IRN.
    const ackNo = (BigInt("0x" + irn.slice(0, 12)) % 1000000000000000n)
      .toString()
      .padStart(15, "0");

    // JWS-structured string so the QR has the right shape — but signature is a clear stub.
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const body = base64url(JSON.stringify({ data: JSON.stringify(qrPayload) }));
    const signedQrString = `${header}.${body}.STUB_UNSIGNED_NOT_VALID_FOR_GST`;

    return { mode: "stub", irn, ackNo, ackDt, signedQrString, qrPayload, payload, signed: false };
  }
}

// ---------------------------------------------------------------------------
// REST GSP adapter — relays to a real GSP. Requires env config to run.
// ---------------------------------------------------------------------------

export class RestGspAdapter implements GspAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private gstin: string
  ) {}

  async generateIrn(input: EInvoiceInput): Promise<EInvoiceResult> {
    const payload = buildEInvoicePayload(input);

    // Generic GSP REST shape. Exact path/headers vary per provider — adjust to your GSP's docs.
    const res = await fetch(`${this.baseUrl}/v1/einvoice/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-Seller-Gstin": this.gstin,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GSP error ${res.status}: ${text.slice(0, 300)}`);
    }

    // GSPs typically wrap the IRP response. Map the common fields.
    const data = (await res.json()) as Record<string, any>;
    const r = data.result ?? data.data ?? data;

    return {
      mode: "live",
      irn: r.Irn ?? r.irn,
      ackNo: String(r.AckNo ?? r.ackNo ?? ""),
      ackDt: r.AckDt ?? r.ackDt ?? nowStamp(),
      signedQrString: r.SignedQRCode ?? r.signedQRCode ?? "",
      qrPayload: buildQrPayload(input, r.Irn ?? r.irn ?? "", r.AckDt ?? nowStamp()),
      payload,
      signed: true,
    };
  }
}

// ---------------------------------------------------------------------------
// ClearTax adapter — 2-step auth (owner_id/gsp_app_id/gsp_app_secret -> auth_token),
// then generate-IRN. The signed IRN + QR come back from ClearTax (relaying the govt IRP).
//
// Defaults use ClearTax's documented GSP paths (/einv-gsp/vital/v1.04/auth,
// /einv-gsp/core/v1.03/Invoice) with the X-CT-Auth-Token header; all env-overridable.
// Before going live, verify CLEARTAX_AUTH_PATH / CLEARTAX_IRN_PATH and the auth-response
// token field name against your ClearTax developer console, and adjust if needed.
// ---------------------------------------------------------------------------

export class ClearTaxGspAdapter implements GspAdapter {
  private static tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private cfg: {
      baseUrl: string;
      ownerId: string;
      gspAppId: string;
      gspAppSecret: string;
      gstin: string;
      authPath: string;
      irnPath: string;
    }
  ) {}

  /**
   * Get (and cache) the ClearTax auth token. ClearTax GSP tokens are valid ~6 hours;
   * we cache for 5.5h and reuse (ClearTax explicitly says don't mint one per request).
   */
  private async getAuthToken(): Promise<string> {
    const cached = ClearTaxGspAdapter.tokenCache;
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const res = await fetch(`${this.cfg.baseUrl}${this.cfg.authPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        owner_id: this.cfg.ownerId,
        gsp_app_id: this.cfg.gspAppId,
        gsp_app_secret: this.cfg.gspAppSecret,
        gstin: this.cfg.gstin,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ClearTax auth failed ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as Record<string, any>;
    // ClearTax GSP auth returns the token (field name varies by API flavour).
    const token =
      data.auth_token ?? data.authToken ?? data.token ?? data?.data?.AuthToken ?? data?.data?.authtoken;
    if (!token) throw new Error("ClearTax auth response had no auth token");

    ClearTaxGspAdapter.tokenCache = { token, expiresAt: Date.now() + 5.5 * 60 * 60 * 1000 };
    return token;
  }

  async generateIrn(input: EInvoiceInput): Promise<EInvoiceResult> {
    const payload = buildEInvoicePayload(input);
    const token = await this.getAuthToken();

    // ClearTax GSP IRN endpoint uses the X-CT-Auth-Token header (client-id/secret NOT sent here).
    const res = await fetch(`${this.cfg.baseUrl}${this.cfg.irnPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CT-Auth-Token": token,
        owner_id: this.cfg.ownerId,
        gstin: this.cfg.gstin,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ClearTax generate-IRN failed ${res.status}: ${text.slice(0, 300)}`);
    }

    // ClearTax wraps the IRP response; the E-Invoice object carries Irn/AckNo/AckDt/SignedQRCode.
    const data = (await res.json()) as Record<string, any>;
    const r = data.data ?? data.result ?? data;
    const irn = r.Irn ?? r.irn;
    if (!irn) throw new Error(`ClearTax response had no IRN: ${JSON.stringify(r).slice(0, 200)}`);
    const ackDt = r.AckDt ?? r.ackDt ?? nowStamp();

    return {
      mode: "live",
      irn,
      ackNo: String(r.AckNo ?? r.ackNo ?? ""),
      ackDt,
      signedQrString: r.SignedQRCode ?? r.signedQRCode ?? "",
      qrPayload: buildQrPayload(input, irn, ackDt),
      payload,
      signed: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getGspAdapter(): GspAdapter {
  const mode = process.env.EINVOICE_MODE ?? "stub";

  if (mode === "cleartax") {
    const {
      CLEARTAX_BASE_URL,
      CLEARTAX_OWNER_ID,
      CLEARTAX_GSP_APP_ID,
      CLEARTAX_GSP_APP_SECRET,
      SELLER_GSTIN,
      CLEARTAX_AUTH_PATH,
      CLEARTAX_IRN_PATH,
    } = process.env;
    if (!CLEARTAX_BASE_URL || !CLEARTAX_OWNER_ID || !CLEARTAX_GSP_APP_ID || !CLEARTAX_GSP_APP_SECRET) {
      throw new Error(
        "EINVOICE_MODE=cleartax but ClearTax credentials are missing. Set CLEARTAX_BASE_URL, " +
          "CLEARTAX_OWNER_ID, CLEARTAX_GSP_APP_ID, CLEARTAX_GSP_APP_SECRET (see .env.local.example), " +
          "or use EINVOICE_MODE=stub."
      );
    }
    return new ClearTaxGspAdapter({
      baseUrl: CLEARTAX_BASE_URL,
      ownerId: CLEARTAX_OWNER_ID,
      gspAppId: CLEARTAX_GSP_APP_ID,
      gspAppSecret: CLEARTAX_GSP_APP_SECRET,
      gstin: SELLER_GSTIN ?? "",
      // ClearTax GSP API documented paths (verify against your console; override via env).
      authPath: CLEARTAX_AUTH_PATH ?? "/einv-gsp/vital/v1.04/auth",
      irnPath: CLEARTAX_IRN_PATH ?? "/einv-gsp/core/v1.03/Invoice",
    });
  }

  if (mode === "rest" || mode === "live") {
    const { GSP_BASE_URL, GSP_API_KEY, SELLER_GSTIN } = process.env;
    if (!GSP_BASE_URL || !GSP_API_KEY) {
      throw new Error(
        "EINVOICE_MODE=rest but GSP_BASE_URL / GSP_API_KEY are not set. " +
          "Add them to .env.local (see .env.local.example) or use EINVOICE_MODE=stub."
      );
    }
    return new RestGspAdapter(GSP_BASE_URL, GSP_API_KEY, SELLER_GSTIN ?? "");
  }

  return new StubGspAdapter();
}

function parseDdMmYyyy(s: string): Date {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
