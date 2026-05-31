# Going live with Razorpay subscriptions

BillEasy ships with **mock billing** by default — clicking "Start trial" activates a plan instantly
(14-day trial, no charge) so you can demo the full flow. To take real money, connect Razorpay.

## Pricing (annual)
| Tier | Price | e-invoice |
|---|---|---|
| Starter | ₹1,499/yr | — |
| Professional | ₹2,999/yr | ✓ |
| Business | ₹5,999/yr | ✓ |

All include a **14-day free trial** before the first charge.

## 1. Create a Razorpay account + get test keys
1. Sign up at https://razorpay.com → Dashboard.
2. Switch to **Test Mode** (toggle, top of dashboard).
3. **Settings → API Keys → Generate Test Key.** Copy `Key Id` and `Key Secret`.

## 2. Create a Plan per tier
Razorpay Subscriptions bill against a **Plan**. In the dashboard:
**Subscriptions → Plans → Create Plan**, one per tier:
- Billing cycle: **Yearly**, interval 1
- Amount: 1499 / 2999 / 5999 (₹) — Razorpay stores it in paise
- Copy each `plan_id` (looks like `plan_XXXXXXXX`).

## 3. Set up the webhook
**Settings → Webhooks → Add New Webhook:**
- URL: `https://<your-domain>/api/billing/webhook` (use an ngrok URL for local testing)
- Secret: choose any strong string — this is your `RAZORPAY_WEBHOOK_SECRET`
- Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`,
  `subscription.completed`, `subscription.halted`

## 4. Configure `.env.local`
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
RAZORPAY_WEBHOOK_SECRET=<the secret you chose>
RAZORPAY_PLAN_STARTER=plan_xxxxxxxx
RAZORPAY_PLAN_PRO=plan_xxxxxxxx
RAZORPAY_PLAN_BUSINESS=plan_xxxxxxxx
```
Restart the dev server. The settings page banner ("mock mode") disappears once keys are present.

## 5. How it works (already implemented)
- **Subscribe** (`/api/billing/subscribe`): live mode creates a Razorpay subscription with
  `start_at` = end of the 14-day trial, stores `razorpaySubscriptionId`, and returns the
  hosted `short_url` — the UI redirects the customer there to authorise the mandate.
- **Webhook** (`/api/billing/webhook`): verifies the `X-Razorpay-Signature` (HMAC-SHA256 of the
  raw body), then on `subscription.activated/charged` sets `planStatus=active` + extends
  `planExpiry`; on `cancelled` marks it cancelled (access until period end).
- **Cancel** (`/api/billing/cancel`): calls Razorpay cancel (at cycle end) and updates status.

## 6. Test the live flow
1. Subscribe to a plan → you're redirected to Razorpay test checkout.
2. Use a [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-details/)
   (e.g. `4111 1111 1111 1111`, any future expiry/CVV).
3. Razorpay fires `subscription.activated` → the webhook flips your plan to **active**.
4. Settings shows the active plan + renewal date.

> Local webhooks: Razorpay can't reach `localhost`. Run `ngrok http 3000` and use the public URL
> for the webhook, or test the subscribe/cancel calls and simulate the webhook from the dashboard.
