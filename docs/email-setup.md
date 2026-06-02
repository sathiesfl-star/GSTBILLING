# Email setup (Resend) — for BillEasy

BillEasy sends email via **Resend**. The code is built with a safe fallback:

- **No `RESEND_API_KEY`** → "mock" mode: emails are logged to the server console, not sent.
  The app works fully; you just won't receive real email.
- **`RESEND_API_KEY` set** → real sending via Resend.

## The domain reality (read this first)
Resend (like every email provider) will only deliver to **arbitrary recipients** once you've
**verified a sending domain**. Until then:

- Resend's test sender `onboarding@resend.dev` can only email **your own verified Resend address**.
- So to email *customers* (password resets, verification), **you must own a domain** and verify it.
- A `.in` domain is ~₹500–800/yr. This is a hard requirement for real users — not optional.

## Step 1 — Resend account + API key (free)
1. Sign up at https://resend.com (free tier: 3,000 emails/month).
2. **API Keys → Create API Key** → copy it.
3. Add to `.env.local` (and Vercel env): `RESEND_API_KEY=re_...`

At this point you can send to **your own** Resend email for testing.

## Step 2 — Verify your domain (required for real users)
1. Buy a domain if you don't have one (e.g. `billeasy.in` via any registrar).
2. Resend → **Domains → Add Domain** → enter your domain.
3. Resend shows **DNS records** (SPF, DKIM, and a DMARC suggestion). Add them at your
   domain registrar's DNS settings (copy-paste; takes ~5 min, propagates in minutes–hours).
4. Wait for Resend to show the domain **Verified** (green).
5. Set the sender: `EMAIL_FROM="BillEasy <noreply@billeasy.in>"` in `.env.local` + Vercel.

## Step 3 — Done
- Emails now send from your domain with good deliverability (SPF/DKIM signed).
- `lib/email.ts` exports `sendEmail()` plus `verifyEmailTemplate()` / `passwordResetTemplate()`.

## Notes
- Keep transactional (resets, verification) and any future marketing email separate.
- `isEmailLive()` tells the app whether real sending is configured (used to show mock banners).
- Don't send app email from Gmail/Workspace SMTP — it gets rate-limited and spam-flagged.
