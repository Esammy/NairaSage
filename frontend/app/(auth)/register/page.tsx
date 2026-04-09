"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/register/", { email, username, password });
      // Login to receive tokens
      const res = await api.post("/auth/token/", { email, password });
      const { access, refresh } = res.data;
      const meResponse = await api.get("/auth/me/", {
        headers: { Authorization: `Bearer ${access}` },
      });
      setTokens(access, refresh, meResponse.data);
      const me = meResponse.data as { onboarded?: boolean };
      if (me.onboarded) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-ink">
      <div className="hidden lg:flex w-1/2 bg-brand flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-brand-accent text-sm font-bold tracking-widest uppercase mb-4 flex items-center justify-start gap-2">
            INSTITUTIONAL STANDARD
          </div>
          <h1 className="text-white text-5xl font-bold tracking-tight">NairaSage</h1>
        </div>

        <div className="relative z-10 max-w-md">
          <blockquote className="text-3xl font-light text-surface-card leading-relaxed italic mb-8">
            &quot;The Sovereign Ledger: Refined wealth management for the modern Nigerian.&quot;
          </blockquote>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-8 sm:px-16 xl:px-32 relative">
        <div className="max-w-sm w-full mx-auto">
          <h2 className="text-3xl font-bold text-ink mb-2">Create an Account</h2>
          <p className="text-ink-muted mb-6">
            Start your financial journey with NairaSage. We will email you a link to verify your address — you need a
            verified email to use AI chat.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Email Address</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@institution.com" className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none transition-all duration-200" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="yourname" className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none transition-all duration-200" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Choose a strong password" className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none transition-all duration-200" />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button disabled={loading} type="submit" className="mt-2 w-full bg-brand text-white py-3.5 rounded-lg font-medium hover:bg-brand-light transition-all flex justify-center items-center gap-2 shadow-md">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
