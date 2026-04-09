"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useAuthStore, setUser } from "@/lib/auth";

export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user || user.is_email_verified) return null;

  const resend = async () => {
    setSending(true);
    setMsg(null);
    try {
      await api.post("/auth/verify-email/resend/");
      setMsg("Verification email sent. Check your inbox.");
    } catch {
      setMsg("Could not send email. Try again later.");
    } finally {
      setSending(false);
    }
  };

  const refreshMe = async () => {
    try {
      const res = await api.get("/auth/me/");
      setUser(res.data);
      setMsg("Profile refreshed.");
    } catch {
      setMsg("Could not refresh. Sign out and sign in again.");
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Verify your email</p>
      <p className="mt-1 text-amber-900/90">
        Confirm your address to use AI chat and agents. Check your inbox for the link, or resend below.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => void resend()}
          className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend verification email"}
        </button>
        <button
          type="button"
          onClick={() => void refreshMe()}
          className="rounded-lg border border-amber-800/30 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          I verified — refresh
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-amber-800">{msg}</p> : null}
    </div>
  );
}
