"use client";

import React, { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function GoalCreateForm() {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const targetNum = parseFloat(target.replace(/,/g, ""));
    if (!title.trim() || !Number.isFinite(targetNum) || targetNum <= 0) {
      setMessage("Enter a title and a positive target amount.");
      return;
    }
    const savedNum = parseFloat((saved || "0").replace(/,/g, "")) || 0;
    setSubmitting(true);
    try {
      const res = await fetch("/api/django/goals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          target_amount: targetNum,
          saved_amount: Math.min(Math.max(0, savedNum), targetNum),
          description: "",
          is_active: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage((err as { detail?: string }).detail || "Could not create goal.");
        return;
      }
      setTitle("");
      setTarget("");
      setSaved("0");
      window.location.reload();
    } catch {
      setMessage("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="glass-card border-border/50 border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">New savings goal</CardTitle>
        <CardDescription>Add a goal the Savings Optimizer can track.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Emergency fund" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Target (₦)</label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="1000000" inputMode="decimal" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Already saved (₦)</label>
              <Input value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" inputMode="decimal" />
            </div>
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create goal
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
