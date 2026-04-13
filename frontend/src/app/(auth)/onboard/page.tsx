"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, TrendingUp, ShieldAlert, Sparkles, Loader2 } from "lucide-react";

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Financial DNA State
  const [dna, setDna] = useState({
    primary_goal: "",
    risk_tolerance: "",
    monthly_income: "",
    financial_literacy_score: 50
  });

  const updateDna = (key: string, value: any) => {
    setDna(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const submitDNA = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dna", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dna)
      });
      
      if (res.ok) {
        router.push("/dashboard");
      } else {
        console.error("DNA failed to save");
        router.push("/dashboard"); // Proceed anyway for MVP smooth flow
      }
    } catch (err) {
      console.error(err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-lg mx-auto w-full pt-10">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Configure AI Co-Pilot</h2>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2 mb-8 overflow-hidden">
        <div className="bg-primary h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">What is your primary financial goal right now?</h3>
          <p className="text-sm text-muted-foreground">Your agents will contextualize all advice toward this objective.</p>
          
          <div className="grid gap-3">
            {[
              { id: "build_wealth", title: "Build Wealth & Invest", desc: "Maximize my capital growth and compound interest." },
              { id: "clear_debt", title: "Clear Existing Debt", desc: "Aggressively pay down expensive loans." },
              { id: "emergency_fund", title: "Build Emergency Fund", desc: "Establish a safety net of 6 months living expenses." }
            ].map(opt => (
              <Card 
                key={opt.id} 
                className={`cursor-pointer transition-all border ${dna.primary_goal === opt.id ? 'border-primary bg-primary/10 shadow-md shadow-primary/10' : 'border-border bg-card hover:bg-secondary/50'}`}
                onClick={() => updateDna("primary_goal", opt.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{opt.title}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                  {dna.primary_goal === opt.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </CardContent>
              </Card>
            ))}
          </div>

          <Button disabled={!dna.primary_goal} onClick={handleNext} className="w-full h-12 bg-primary text-primary-foreground hover:bg-gold-600 mt-6">
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">What is your risk tolerance?</h3>
          <p className="text-sm text-muted-foreground">How do you handle market volatility?</p>
          
          <div className="grid gap-3">
            <Card className={`cursor-pointer transition-all border ${dna.risk_tolerance === 'conservative' ? 'border-primary bg-primary/10' : 'border-border bg-card'}`} onClick={() => updateDna("risk_tolerance", "conservative")}>
              <CardContent className="p-4 flex items-center gap-4">
                <ShieldAlert className={`w-8 h-8 ${dna.risk_tolerance === 'conservative' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <div className="font-semibold text-foreground">Conservative</div>
                  <div className="text-xs text-muted-foreground">Capital preservation. T-Bills, FGN Bonds.</div>
                </div>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all border ${dna.risk_tolerance === 'aggressive' ? 'border-primary bg-primary/10' : 'border-border bg-card'}`} onClick={() => updateDna("risk_tolerance", "aggressive")}>
              <CardContent className="p-4 flex items-center gap-4">
                <TrendingUp className={`w-8 h-8 ${dna.risk_tolerance === 'aggressive' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <div className="font-semibold text-foreground">Aggressive</div>
                  <div className="text-xs text-muted-foreground">High growth. Equities, Crypto, Tech startups.</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4 mt-6">
            <Button variant="outline" onClick={() => setStep(1)} className="w-1/3 h-12 border-border text-foreground hover:bg-secondary">Back</Button>
            <Button disabled={!dna.risk_tolerance} onClick={handleNext} className="w-2/3 h-12 bg-primary text-primary-foreground hover:bg-gold-600">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Average Monthly Income (₦)</h3>
          <p className="text-sm text-muted-foreground">Your Accountant agent uses this to forecast savings rates.</p>
          
          <div className="mt-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
              <input
                type="number"
                value={dna.monthly_income}
                onChange={(e) => updateDna("monthly_income", e.target.value)}
                placeholder="500000"
                className="w-full h-14 pl-8 pr-4 rounded-md bg-secondary/50 border border-border focus:ring-2 focus:ring-primary focus:outline-none text-foreground font-medium text-lg"
              />
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mt-6">
            <p className="text-xs text-primary font-medium leading-relaxed">
              By finalizing, you deploy 11 intelligent agents to monitor and optimize your portfolio based on these exact constraints.
            </p>
          </div>

          <div className="flex gap-4 mt-6">
            <Button variant="outline" onClick={() => setStep(2)} className="w-1/3 h-12 border-border text-foreground hover:bg-secondary" disabled={loading}>Back</Button>
            <Button disabled={!dna.monthly_income || loading} onClick={submitDNA} className="w-2/3 h-12 bg-primary text-primary-foreground hover:bg-gold-600 shadow-md shadow-primary/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Agents to Dashboard"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
