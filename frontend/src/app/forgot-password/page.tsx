"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/ui/BrandMark";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/django/auth/password-reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* same response either way to reduce enumeration */
    }
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8">
        <BrandMark />
      </Link>
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
        {submitted ? (
          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 text-sm text-foreground">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              If an account exists for {email}, we sent password reset instructions to that inbox.
              Check spam if you do not see it within a few minutes.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email on your account and we will send a secure reset link.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-12 bg-secondary/50 border-border"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-gold-600"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
