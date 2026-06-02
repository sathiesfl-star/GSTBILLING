import Link from "next/link";
import {
  FileText,
  Zap,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  Clock,
  FileWarning,
  Check,
  ArrowRight,
  QrCode as QrIcon,
} from "lucide-react";

export const metadata = {
  title: "BillEasy — Generate GST e-invoices (IRN + QR) in 1 click",
  description:
    "GST billing & e-invoicing for Indian businesses. Create a compliant invoice, generate the IRN + QR, and file your GSTR — without the manual work.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white/90 px-5 py-3 backdrop-blur sm:px-8">
        <div className="text-xl font-bold text-brand">
          Bill<span className="text-slate-900">Easy</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-brand">Features</a>
          <a href="#how" className="hover:text-brand">How it works</a>
          <a href="#pricing" className="hover:text-brand">Pricing</a>
          <a href="#faq" className="hover:text-brand">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand">
            Sign in
          </Link>
          <Link href="/register" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Start free
          </Link>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
            <ShieldCheck className="h-3.5 w-3.5" /> E-invoicing is mandatory above ₹5 crore turnover
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Generate GST e-invoices <span className="text-brand">(IRN + QR)</span> in 1 click.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            For Indian businesses. Create a GST-compliant invoice, generate the IRN, send it on
            WhatsApp, and file your GSTR — all in under a minute, no manual work.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
              Start free — 14-day trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-lg border px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              See the live demo
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">No credit card required · Works on mobile · ₹ pricing</p>
        </div>

        {/* Product mockup */}
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-brand-light to-transparent" />
          <div className="overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between bg-brand px-4 py-2.5 text-white">
              <span className="text-sm font-bold">TAX INVOICE</span>
              <span className="text-xs opacity-90">INV-2425-0014</span>
            </div>
            <div className="space-y-3 p-4 text-xs">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Stallioni Trading Co.</div>
                  <div className="text-slate-500">GSTIN: 33AAPFU0939F1ZV · Tamil Nadu</div>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-900 text-white">
                  <QrIcon className="h-10 w-10" />
                </div>
              </div>
              <div className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                ✓ IRN a8151f47…fdb95d · Ack 184808672565928
              </div>
              <table className="w-full">
                <thead className="text-[10px] uppercase text-slate-400">
                  <tr><th className="text-left font-medium">Item</th><th className="text-right font-medium">Qty</th><th className="text-right font-medium">Amount</th></tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr><td>Air Conditioner 1.5T</td><td className="text-right">3</td><td className="text-right">₹1,04,997</td></tr>
                  <tr><td>Annual Maintenance</td><td className="text-right">1</td><td className="text-right">₹12,000</td></tr>
                </tbody>
              </table>
              <div className="flex justify-between border-t pt-2 text-sm font-bold text-slate-900">
                <span>Grand Total</span><span>₹1,37,936</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Trust strip ---------------- */}
      <section className="border-y bg-slate-50 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 text-center text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> NIC e-invoice format</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> All 5 GST rates</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> GSTR-1 &amp; 3B export</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Works across all states</span>
        </div>
      </section>

      {/* ---------------- Problem ---------------- */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">GST compliance shouldn&apos;t cost you hours — or penalties</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { icon: FileWarning, title: "Manual IRN is error-prone", body: "Typing invoices into the government portal one by one invites costly mistakes and rejected invoices." },
            { icon: AlertTriangle, title: "Non-compliance is expensive", body: "Penalties run up to ₹10,000 per invoice for missing or incorrect e-invoices above the turnover limit." },
            { icon: Clock, title: "Filing eats your month", body: "Compiling GSTR-1 and 3B from spreadsheets every month is slow, tedious, and easy to get wrong." },
          ].map((p) => (
            <div key={p.title} className="rounded-xl border bg-white p-5">
              <div className="inline-flex rounded-lg bg-red-50 p-2 text-red-600"><p.icon className="h-5 w-5" /></div>
              <h3 className="mt-3 font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Features / Solution ---------------- */}
      <section id="features" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Everything you need to bill &amp; stay compliant</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">From a single screen — no accountant-speak, no spreadsheets.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, title: "1-click e-invoice (IRN + QR)", body: "Generate the real NIC IRN and signed QR for any B2B invoice. Required above ₹5cr — optional below." },
              { icon: Zap, title: "Automatic GST calculation", body: "CGST/SGST for local sales, IGST for interstate, B2C handled — across all 5 GST rates, in real time." },
              { icon: FileText, title: "Legal tax-invoice PDF", body: "Every mandatory GST field, a clean professional layout, ready to print or download." },
              { icon: FileText, title: "GSTR-1 & 3B export", body: "Download portal-ready JSON for your monthly returns — upload to gst.gov.in in seconds." },
              { icon: MessageCircle, title: "WhatsApp delivery", body: "Send the invoice and a payment link to your customer in one tap." },
              { icon: QrIcon, title: "E-way bill ready", body: "Generate e-way bill details for consignments above ₹50,000, alongside the invoice." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 rounded-xl border bg-white p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand"><f.icon className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">From sale to compliant invoice in 3 steps</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { n: "1", title: "Create the invoice", body: "Pick a customer and items — GST is calculated automatically as you type." },
            { n: "2", title: "Generate the e-invoice", body: "One click produces the IRN + QR and a legal PDF, ready to send." },
            { n: "3", title: "Send & file", body: "Share on WhatsApp, then export GSTR-1/3B JSON for your monthly return." },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">{s.n}</div>
              <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Pricing ---------------- */}
      <section id="pricing" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Simple, honest pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">Billed annually. 14-day free trial on every paid plan. Cancel anytime.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { tier: "Starter", price: "₹1,499", per: "/year", featured: false, who: "Solo traders & small shops", features: ["Unlimited invoices", "GST calculation & PDF", "GSTR-1 & 3B export", "WhatsApp delivery", "1 user"] },
              { tier: "Professional", price: "₹2,999", per: "/year", featured: true, who: "Growing ₹5cr+ businesses", features: ["Everything in Starter", "1-click e-invoice (IRN + QR)", "E-way bill", "Remove branding", "3 users"] },
              { tier: "Business", price: "₹5,999", per: "/year", featured: false, who: "Multi-location businesses", features: ["Everything in Professional", "Multi-branch", "CA access", "Priority support", "10 users"] },
            ].map((p) => (
              <div key={p.tier} className={`rounded-2xl border bg-white p-6 ${p.featured ? "border-brand ring-2 ring-brand" : ""}`}>
                {p.featured && <div className="mb-2 inline-block rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-semibold text-brand">Most popular</div>}
                <h3 className="font-semibold text-slate-900">{p.tier}</h3>
                <p className="text-xs text-slate-500">{p.who}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-3xl font-bold text-slate-900">{p.price}</span>
                  <span className="pb-1 text-sm text-slate-500">{p.per}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold ${p.featured ? "bg-brand text-white hover:bg-brand-dark" : "border text-slate-700 hover:bg-slate-50"}`}>
                  Start 14-day trial
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">Also have a <b>Free</b> plan — 20 invoices/month to get started. <Link href="/register" className="font-medium text-brand hover:underline">Sign up free →</Link></p>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {[
            { q: "Do I need e-invoicing for my business?", a: "E-invoicing (IRN) is mandatory only if your annual turnover is above ₹5 crore. Below that, it's optional — you can still use BillEasy for invoicing, GST, and return filing without it." },
            { q: "Is the e-invoice IRN government-valid?", a: "BillEasy generates the IRN using the exact official NIC algorithm and builds the GST e-invoice JSON. For a government-signed QR, BillEasy connects to a licensed GSP — we'll enable that for your account when you go live." },
            { q: "Can my CA use it?", a: "Yes. BillEasy gives your CA a clean, portal-ready GSTR-1/3B JSON to upload — instead of a shoebox of invoices. The Business plan includes CA access." },
            { q: "How do I actually file my returns?", a: "BillEasy prepares the return file; you upload it on gst.gov.in and submit. There's a step-by-step guide built into the Reports page." },
            { q: "Does it work on my phone?", a: "Yes — BillEasy is fully mobile-responsive. Create and send invoices from your phone." },
            { q: "Is my data safe?", a: "Your data is stored securely with per-business isolation and password-protected access. You can sign in with Google for added security." },
          ].map((f) => (
            <details key={f.q} className="group rounded-xl border bg-white p-4">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-900">
                {f.q}
                <span className="text-slate-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="bg-brand py-14">
        <div className="mx-auto max-w-3xl px-5 text-center text-white sm:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Start billing in the next 2 minutes</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-light/90">
            Create your business, make your first GST invoice, and generate an e-invoice — free for 14 days.
          </p>
          <Link href="/register" className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-white px-6 py-3 font-semibold text-brand hover:bg-slate-100">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 text-sm text-slate-500 sm:flex-row sm:px-8">
          <div className="font-bold text-brand">Bill<span className="text-slate-900">Easy</span></div>
          <div className="flex gap-5">
            <a href="#features" className="hover:text-brand">Features</a>
            <a href="#pricing" className="hover:text-brand">Pricing</a>
            <a href="#faq" className="hover:text-brand">FAQ</a>
            <Link href="/login" className="hover:text-brand">Sign in</Link>
          </div>
          <div className="text-xs text-slate-400">GST billing &amp; e-invoicing for India</div>
        </div>
      </footer>
    </main>
  );
}
