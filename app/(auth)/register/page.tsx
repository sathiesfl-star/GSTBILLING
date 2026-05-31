"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", gstin: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Registration failed");
      return;
    }
    // Auto sign-in after successful registration.
    const signin = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setLoading(false);
    if (signin?.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-7 shadow-sm">
        <Link href="/" className="text-xl font-bold text-brand">
          Bill<span className="text-slate-900">Easy</span>
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500">Set up your business in 30 seconds.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <Field label="Your name" value={form.name} onChange={set("name")} />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
          <Field label="Password" type="password" value={form.password} onChange={set("password")} required />
          <Field label="Business name" value={form.businessName} onChange={set("businessName")} required />
          <Field label="GSTIN" value={form.gstin} onChange={(v) => set("gstin")(v.toUpperCase())} required hint="15-char GSTIN, e.g. 33AAPFU0939F1ZV" />
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {hint && <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
