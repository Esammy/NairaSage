"use client";

import Link from "next/link";
import { useState } from "react";
import axios from "axios";
import { SUPPORT_EMAIL } from "@/lib/support";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE}/api/auth/password-reset/`, { email: email.trim() });
      setSent(true);
    } catch {
      setError("Something went wrong. Try again or contact support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-16 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-ink-faint/20 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand">Reset password</h1>
        {sent ? (
          <>
            <p className="mt-3 text-sm text-ink-muted leading-relaxed">
              If an account exists for that email, we sent instructions. Check your inbox and follow the link to choose a
              new password.
            </p>
            <div className="mt-8 flex flex-col gap-3 text-sm font-semibold">
              <Link href="/login" className="rounded-lg bg-brand px-4 py-3 text-center text-white hover:bg-brand-light">
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-muted leading-relaxed">
              Enter the email on your account. We will send a reset link if it exists.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none"
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand px-4 py-3 text-center text-white font-semibold hover:bg-brand-light disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <div className="mt-8 flex flex-col gap-3 text-sm font-semibold">
              <Link href="/login" className="text-center text-brand hover:underline">
                Back to sign in
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="rounded-lg border border-ink-faint/30 px-4 py-3 text-center text-ink hover:bg-surface"
              >
                Email support
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
