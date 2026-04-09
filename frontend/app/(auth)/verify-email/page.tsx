"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function VerifyFetch({ uid, token }: { uid: string; token: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/verify-email/`, {
          params: { uid, token },
        });
        setStatus("ok");
        setMessage(String(res.data?.detail || "Email verified."));
      } catch (err: unknown) {
        setStatus("err");
        const d = axios.isAxiosError(err) ? err.response?.data : null;
        setMessage(
          (d && typeof d === "object" && "detail" in d && String((d as { detail: unknown }).detail)) ||
            "Verification failed. The link may have expired."
        );
      }
    })();
  }, [uid, token]);

  return (
    <>
      {status === "loading" ? (
        <p className="mt-3 text-sm text-ink-muted">Verifying your email…</p>
      ) : (
        <p className={`mt-3 text-sm leading-relaxed ${status === "ok" ? "text-ink-muted" : "text-red-600"}`}>
          {message}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 text-sm font-semibold">
        <Link href="/login" className="rounded-lg bg-brand px-4 py-3 text-center text-white hover:bg-brand-light">
          Sign in
        </Link>
        <Link href="/dashboard" className="text-center text-brand hover:underline">
          Go to dashboard
        </Link>
      </div>
    </>
  );
}

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  if (!uid || !token) {
    return (
      <>
        <p className="mt-3 text-sm text-red-600">Missing verification parameters.</p>
        <div className="mt-8">
          <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        </div>
      </>
    );
  }

  return <VerifyFetch uid={uid} token={token} />;
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-16 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-ink-faint/20 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand">Email verification</h1>
        <Suspense fallback={<p className="mt-3 text-sm text-ink-muted">Loading…</p>}>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}
