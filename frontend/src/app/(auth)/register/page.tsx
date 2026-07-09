"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
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
    // Merge first and last name into username or handle separately depending on Django constraints
    const username = formData.get("first-name")?.toString().toLowerCase().replace(/\s/g, "") || "user" + Date.now();

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, phone: "" }),
      });

      if (!res.ok) {
        throw new Error("Registration failed. Email might be in use.");
      }

      // Successfully registered and logged in via proxy
      router.push("/onboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-primary font-semibold mb-3">
        Step 1 of 2
      </p>
      <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        Create your account
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <div className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md border border-destructive"
            >
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first-name" className="block text-sm font-medium text-foreground">
                First name
              </label>
              <div className="mt-1.5">
                <Input
                  id="first-name"
                  name="first-name"
                  type="text"
                  required
                  className="bg-muted/40 border-border focus-visible:ring-ring h-11 rounded-md"
                />
              </div>
            </div>
            <div>
              <label htmlFor="last-name" className="block text-sm font-medium text-foreground">
                Last name
              </label>
              <div className="mt-1.5">
                <Input
                  id="last-name"
                  name="last-name"
                  type="text"
                  required
                  className="bg-muted/40 border-border focus-visible:ring-ring h-11 rounded-md"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <div className="mt-1.5">
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="bg-muted/40 border-border focus-visible:ring-ring h-11 rounded-md"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                required
                className="bg-muted/40 border-border focus-visible:ring-ring h-11 rounded-md"
              />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-md font-semibold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue to Wealth Discovery"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  );
}
