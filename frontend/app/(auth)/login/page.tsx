"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Shield, ArrowRight } from "lucide-react";
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

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokenResponse = await api.post("/auth/token/", { email, password });
      const { access, refresh } = tokenResponse.data ?? {};
      const meResponse = await api.get("/auth/me/", {
        headers: { Authorization: `Bearer ${access}` },
      });
      setTokens(access, refresh, meResponse.data);
      const me = meResponse.data as { onboarded?: boolean };
      const next = safeNextPath(searchParams.get("next"));
      if (me.onboarded) {
        router.push(next ?? "/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Unable to sign in with those credentials."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-ink">
      {/* Left Pane - Brand / Philosophy */}
      <div className="hidden lg:flex w-1/2 bg-brand flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid/line pattern overlay for 'institutional' feel */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
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
          
          <div className="flex items-center gap-4 text-brand-accent text-sm">
            <div className="h-px bg-brand-accent w-12" />
            THE SAGE PHILOSOPHY
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-brand-muted text-sm font-medium delay-300 animate-fade-in">
          <Shield className="w-4 h-4" /> ELITE TIER ACCESS ONLY
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-8 sm:px-16 xl:px-32 relative">
        <div className="max-w-sm w-full mx-auto">
          <h2 className="text-3xl font-bold text-ink mb-2">Welcome Back</h2>
          <p className="text-ink-muted mb-10">Access your private sovereign portfolio.</p>

          <div className="flex gap-6 border-b border-ink-faint/30 mb-8 pb-3">
            <button className="text-brand font-semibold text-sm border-b-2 border-brand pb-3 -mb-[14px]">Sign in</button>
            <Link href="/register" className="text-ink-muted hover:text-ink font-medium text-sm">Create an account</Link>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                placeholder="name@institution.com" 
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none transition-all duration-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Password</label>
                <Link href="/forgot" className="text-xs text-ink-muted hover:text-brand transition-colors">FORGOT SECRET?</Link>
              </div>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface border border-transparent focus:border-brand-accent focus:bg-white focus:outline-none transition-all duration-200"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-brand text-white py-3.5 rounded-lg font-medium hover:bg-brand-light transition-all flex justify-center items-center gap-2 shadow-md disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in to NairaSage"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-10 flex items-center justify-center gap-4 text-xs font-semibold text-ink-muted uppercase tracking-wider mb-6">
            <div className="h-px bg-ink-faint/30 flex-1" />
            <span>Institutional Connect</span>
            <div className="h-px bg-ink-faint/30 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-ink-faint/30 hover:bg-surface transition-colors font-medium text-sm">
              <div className="w-4 h-4 rounded-full bg-[linear-gradient(45deg,#ea4335,#4285f4,#34a853,#fbbc05)]" /> Google
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-ink-faint/30 hover:bg-surface transition-colors font-medium text-sm">
              <Shield className="w-4 h-4 text-ink" /> Apple
            </button>
          </div>

          <p className="text-xs text-center text-ink-muted leading-relaxed">
            By continuing, you agree to our <span className="font-semibold text-ink">Terms</span> and <span className="font-semibold text-ink">Privacy Policy</span>. Your data is encrypted and <i>NDPA compliant.</i>
          </p>

          <div className="mt-8 flex items-center justify-center gap-6 text-[10px] font-bold text-ink-muted/60 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 256-BIT AES</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> NDPA CERTIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-ink-muted text-sm">
          Loading sign-in…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
