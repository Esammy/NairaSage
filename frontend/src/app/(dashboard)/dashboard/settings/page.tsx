"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Me = {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_email_verified: boolean;
  tier: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/django/auth/me", { credentials: "include" });
        if (!res.ok) {
          setMe(null);
          return;
        }
        const data: Me = await res.json();
        setMe(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setUsername(data.username || "");
        setPhone(data.phone || "");
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/django/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          phone: phone.trim(),
        }),
      });
      if (!res.ok) {
        setMessage("Could not save profile.");
        return;
      }
      const data: Me = await res.json();
      setMe(data);
      setMessage("Saved.");
    } catch {
      setMessage("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-8">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading profile…
      </div>
    );
  }

  if (!me) {
    return (
      <p className="text-muted-foreground p-4">
        You are not signed in. <a href="/login" className="text-primary underline">Log in</a>
      </p>
    );
  }

  return (
    <div className="space-y-8 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Profile from your NairaSage account.</p>
      </div>

      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Email: <span className="text-foreground">{me.email}</span>
            {me.is_email_verified ? (
              <span className="ml-2 text-emerald-500 text-xs">(verified)</span>
            ) : (
              <span className="ml-2 text-amber-500 text-xs">(not verified)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">First name</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Last name</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Plan: {me.tier}</p>
            {message ? <p className="text-sm text-primary">{message}</p> : null}
            <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/50 border-destructive/20">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="border-destructive/40 text-destructive" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
