"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getAccessToken, getRefreshToken, setTokens, useAuthStore } from "@/lib/auth";

const questions = [
  { key: "monthly_income", label: "What's your approximate monthly income (NGN)?", placeholder: "e.g. 250000" },
  { key: "primary_goal", label: "Primary financial goal", options: ["Buy a house", "Retirement", "Emergency fund", "Grow investments"] },
  { key: "risk_tolerance", label: "Risk tolerance", options: ["conservative", "moderate", "aggressive"] },
  { key: "investment_horizon", label: "Investment horizon (years)", options: ["1", "3", "5", "10"] },
  { key: "life_stage", label: "Life stage", options: ["early_career", "mid_career", "family_building", "pre_retirement"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const onboarded = useAuthStore((s) => s.user?.onboarded);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = questions[step];

  useEffect(() => {
    if (onboarded) {
      router.replace("/dashboard");
    }
  }, [onboarded, router]);

  const setAnswer = (value: string) => setAnswers((s) => ({ ...s, [q.key]: value }));

  const payload = useMemo(
    () => ({
      monthly_income: answers.monthly_income || null,
      primary_goal: answers.primary_goal || "",
      risk_tolerance: answers.risk_tolerance || "",
      investment_horizon: answers.investment_horizon ? Number(answers.investment_horizon) : null,
      life_stage: answers.life_stage || "",
    }),
    [answers]
  );

  const next = async () => {
    if (step < questions.length - 1) return setStep((s) => s + 1);

    // final submit
    setLoading(true);
    setError(null);
    try {
      await api.patch("/dna/", payload);
      const meResponse = await api.get("/auth/me/");
      setTokens(getAccessToken(), getRefreshToken(), meResponse.data);
      router.push("/dashboard/chat");
    } catch (error: unknown) {
      const fallbackMessage = "Unable to save profile";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object"
      ) {
        const response = (error as { response?: { data?: { detail?: string } } }).response;
        setError(response?.data?.detail || fallbackMessage);
      } else {
        setError(fallbackMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-md">
        <h2 className="text-2xl font-bold mb-4">Quick Financial Onboarding</h2>
        <p className="text-ink-muted mb-6">A short set of questions to personalize your experience.</p>

        <div className="mb-6">
          <div className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">Step {step + 1} of {questions.length}</div>
          <div className="text-lg font-medium mb-2">{q.label}</div>

          {q.options ? (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {q.options.map((opt) => (
                <button key={opt} onClick={() => setAnswer(opt)} type="button" className={`p-3 border rounded-lg text-left ${answers[q.key] === opt ? 'border-brand bg-brand/5' : 'border-ink-faint/20'}`}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input value={answers[q.key] || ""} onChange={(e) => setAnswer(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-surface border border-ink-faint/20" placeholder={q.placeholder || ""} />
          )}
        </div>

        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="flex items-center justify-between">
          <button disabled={step===0} onClick={() => setStep((s)=>s-1)} className="px-4 py-2 rounded-lg border">Back</button>
          <button onClick={next} className="px-6 py-2 rounded-lg bg-brand text-white">{step < questions.length - 1 ? 'Next' : (loading ? 'Saving...' : 'Finish')}</button>
        </div>
      </div>
    </div>
  );
}
