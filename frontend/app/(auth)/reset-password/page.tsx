"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (!uid || !token) {
      setError("Invalid or missing reset link. Request a new reset from the sign-in page.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/auth/password-reset/confirm/`, {
        uid,
        token,
        password,
      });
      setDone(true);
    } catch (err: unknown) {
      const d = axios.isAxiosError(err) ? err.response?.data : null;
      const msg =
        (d && typeof d === "object" && "detail" in d && String((d as { detail: unknown }).detail)) ||
        "Could not reset password. The link may have expired.";
      setError(typeof msg === "string" ? msg : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <p className="mt-3 text-sm text-ink-muted leading-relaxed">
        This page needs a valid reset link from your email.{" "}
        <Link href="/forgot" className="font-semibold text-brand hover:underline">
          Request a new link
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <>
        <p className="mt-3 text-sm text-ink-muted leading-relaxed">Your password has been updated.</p>
        <Link
          href="/login"
          className="mt-8 inline-block w-full rounded-lg bg-brand px-4 py-3 text-center text-white font-semibold hover:bg-brand-light"
        >
          Sign in
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        autoComplete="new-password"
        className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none"
      />
      <input
        type="password"
        required
        value={password2}
        onChange={(e) => setPassword2(e.target.value)}
        placeholder="Confirm password"
        autoComplete="new-password"
        className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand px-4 py-3 text-center text-white font-semibold hover:bg-brand-light disabled:opacity-60"
      >
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-16 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-ink-faint/20 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand">New password</h1>
        <Suspense fallback={<p className="mt-3 text-sm text-ink-muted">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
