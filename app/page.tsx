import Link from "next/link";
import { FileText, Zap, ShieldCheck, MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="text-xl font-bold text-brand">
          Bill<span className="text-slate-900">Easy</span>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Open Dashboard
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="mb-4 inline-block rounded-full bg-brand-light px-4 py-1 text-sm font-medium text-brand">
          New ₹2 crore e-invoice rule is now live
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Get GST e-invoices <span className="text-brand">(IRN + QR)</span>
          <br /> in 1 click.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Stay compliant with the new ₹2 crore e-invoicing mandate. Create a
          legal GST invoice, generate the IRN, and send it on WhatsApp — in under
          30 seconds.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/invoice/new"
            className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark"
          >
            Try the invoice builder →
          </Link>
          <span className="text-sm text-slate-500">
            Prototype · mock data · real GST math
          </span>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, title: "E-invoice ready", body: "1-click IRN + signed QR for the new ₹2cr mandate." },
          { icon: Zap, title: "Real-time GST", body: "CGST/SGST or IGST auto-calculated as you type." },
          { icon: FileText, title: "Legal tax invoice", body: "All mandatory GST fields, professional PDF." },
          { icon: MessageCircle, title: "WhatsApp delivery", body: "Send invoice + payment link in one tap." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-white p-5">
            <f.icon className="h-6 w-6 text-brand" />
            <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
