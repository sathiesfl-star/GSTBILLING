/**
 * Email sending — Resend REST API, with a safe mock fallback.
 *
 *   RESEND_API_KEY set  -> sends for real via Resend.
 *   not set (default)   -> "mock" mode: logs the email to the server console and returns ok.
 *
 * This means the app runs with zero email config (mock), and goes live by adding one env var
 * — no code change. See docs/email-setup.md.
 *
 * NOTE: real sending to ARBITRARY recipients requires a VERIFIED DOMAIN in Resend. Until then,
 * Resend's test sender (onboarding@resend.dev) can only email your own verified address.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  mode: "resend" | "mock";
  id?: string;
  error?: string;
}

export function isEmailLive(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function fromAddress(): string {
  // Use EMAIL_FROM once a domain is verified; fall back to Resend's test sender.
  return process.env.EMAIL_FROM || "BillEasy <onboarding@resend.dev>";
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // ---- MOCK: no key — log and pretend success (dev-friendly) ----
  if (!apiKey) {
    console.log(
      `\n📧 [email mock] To: ${input.to}\n   Subject: ${input.subject}\n   (set RESEND_API_KEY to send for real)\n`
    );
    return { ok: true, mode: "mock" };
  }

  // ---- LIVE: Resend ----
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, mode: "resend", error: data.message ?? `Resend error ${res.status}` };
    }
    return { ok: true, mode: "resend", id: data.id };
  } catch (err) {
    return { ok: false, mode: "resend", error: err instanceof Error ? err.message : "Send failed" };
  }
}

// ---------------------------------------------------------------------------
// Templates (simple, brandable). Keep inline styles — email clients ignore <style>.
// ---------------------------------------------------------------------------

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#1a56db;padding:16px 20px;color:#fff;font-size:18px;font-weight:bold">BillEasy</div>
    <div style="padding:20px">
      <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <div style="padding:14px 20px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
      BillEasy — GST billing & e-invoicing. This is an automated message.
    </div>
  </div></body></html>`;
}

export function verifyEmailTemplate(link: string) {
  return {
    subject: "Verify your BillEasy email",
    html: shell(
      "Confirm your email",
      `<p style="font-size:14px;color:#475569">Click below to verify your email and activate your BillEasy account.</p>
       <p style="margin:18px 0"><a href="${link}" style="background:#1a56db;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;font-size:14px">Verify email</a></p>
       <p style="font-size:12px;color:#94a3b8">If you didn't create a BillEasy account, ignore this email.</p>`
    ),
    text: `Verify your BillEasy email: ${link}`,
  };
}

export function passwordResetTemplate(link: string) {
  return {
    subject: "Reset your BillEasy password",
    html: shell(
      "Reset your password",
      `<p style="font-size:14px;color:#475569">We received a request to reset your password. This link expires in 1 hour.</p>
       <p style="margin:18px 0"><a href="${link}" style="background:#1a56db;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;font-size:14px">Reset password</a></p>
       <p style="font-size:12px;color:#94a3b8">If you didn't request this, you can safely ignore it — your password won't change.</p>`
    ),
    text: `Reset your BillEasy password (expires in 1 hour): ${link}`,
  };
}
