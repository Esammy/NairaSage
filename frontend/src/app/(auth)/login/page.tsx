"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

function IdleTimeoutNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "timeout") return null;
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
    >
      You were signed out after 30 minutes with no activity. Sign in again to continue.
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid email or password.");
      }

      router.push("/wealth");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <IdleTimeoutNotice />
      <h2 className="text-3xl font-bold tracking-tight text-foreground">Sign in to your account</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:text-gold-600 transition-colors">
          Start your journey
        </Link>
      </p>

      <div className="mt-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md border border-destructive">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-foreground">
              Email address
            </label>
            <div className="mt-2">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="bg-secondary/50 border-border focus-visible:ring-primary h-12"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-foreground">
                Password
              </label>
              <div className="text-sm">
                <a href="#" className="font-semibold text-primary hover:text-gold-600">
                  Forgot password?
                </a>
              </div>
            </div>
            <div className="mt-2">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="bg-secondary/50 border-border focus-visible:ring-primary h-12"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-gold-600 shadow-md shadow-gold-500/20 text-md"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader2 className="mx-auto my-12 h-8 w-8 animate-spin text-muted-foreground" />}>
      <LoginForm />
    </Suspense>
  );
}
