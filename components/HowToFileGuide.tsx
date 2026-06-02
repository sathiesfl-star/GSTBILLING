"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, HelpCircle } from "lucide-react";

interface Step {
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Download your GSTR-1 JSON",
    body: (
      <>Use the <b>Download GSTR-1 JSON</b> button above. BillEasy builds it in the exact format the
      GST portal expects — no manual typing.</>
    ),
  },
  {
    title: "Log in to the GST portal",
    body: (
      <>Go to{" "}
        <a href="https://www.gst.gov.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-brand hover:underline">
          gst.gov.in <ExternalLink className="h-3 w-3" />
        </a>{" "}
        and sign in with your GSTIN credentials.</>
    ),
  },
  {
    title: "Open GSTR-1 for this period",
    body: <>Go to <b>Returns Dashboard</b> → select the financial year &amp; month → under <b>GSTR-1</b> click <b>Prepare Offline</b>.</>,
  },
  {
    title: "Upload the JSON",
    body: <>On the Offline Upload page, click <b>Choose File</b>, select the JSON you downloaded, and upload. The portal processes it and fills in your invoices automatically.</>,
  },
  {
    title: "Review & Submit",
    body: <>Back on the GSTR-1 summary, check the figures match the totals shown here, then <b>Submit</b> and <b>File</b> (with EVC/DSC).</>,
  },
  {
    title: "File GSTR-3B & pay tax",
    body: <>Separately, file <b>GSTR-3B</b> (the summary return) and pay the net GST due. The 3.1 figures below are your outward-supply numbers for it.</>,
  },
];

export function HowToFileGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-brand/30 bg-brand-light/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <HelpCircle className="h-5 w-5 text-brand" /> How to file these returns on the GST portal
        </span>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-brand/20 px-5 py-4">
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="text-sm">
                  <div className="font-medium text-slate-900">{s.title}</div>
                  <div className="mt-0.5 text-slate-600">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 grid gap-2 rounded-lg bg-white p-3 text-xs text-slate-600 sm:grid-cols-2">
            <div>🗓️ <b>GSTR-1</b> due: usually the <b>11th</b> of the next month</div>
            <div>🗓️ <b>GSTR-3B</b> due: usually the <b>20th</b> of the next month</div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Note: BillEasy prepares the return file; you submit it on the official portal. Deadlines and
            screens are set by GSTN and can change — confirm with your CA or on gst.gov.in.
          </p>
        </div>
      )}
    </section>
  );
}
