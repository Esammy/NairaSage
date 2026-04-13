import React from "react";
import { cookies } from "next/headers";
import { Target, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { djangoServerFetch, unwrapResults } from "@/lib/django-api";
import { GoalCreateForm } from "./GoalCreateForm";

export const dynamic = "force-dynamic";

type SavingsGoal = {
  id: number;
  title: string;
  target_amount: string;
  saved_amount: string;
  is_active: boolean;
};

async function getGoals(token: string | undefined): Promise<SavingsGoal[]> {
  if (!token) return [];
  try {
    const res = await djangoServerFetch("goals", token);
    if (!res.ok) return [];
    const body = await res.json();
    return unwrapResults<SavingsGoal>(body);
  } catch {
    return [];
  }
}

export default async function GoalsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const goals = await getGoals(token);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">Savings goals</h1>
          <p className="text-muted-foreground mt-1">Track targets and saved amounts in naira.</p>
        </div>
      </div>

      <GoalCreateForm />

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-border/50 rounded-lg p-4 bg-muted/30">
          No goals yet. Create one above — forecasts and surplus allocation will use these targets as
          they are added to the backend.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const current = Number(goal.saved_amount || 0);
          const target = Number(goal.target_amount || 1);
          const progress = Math.min((current / target) * 100, 100);
          const isCompleted = progress >= 100;

          return (
            <Card
              key={goal.id}
              className={`glass-card border-border/50 shadow-md shadow-primary/5 ${isCompleted ? "opacity-80" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-primary/10">
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Target className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  {goal.is_active ? (
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-xl mt-4">{goal.title}</CardTitle>
                <CardDescription>{isCompleted ? "Target reached" : "In progress"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-foreground">₦{current.toLocaleString()}</span>
                    <span className="text-muted-foreground">Target: ₦{target.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isCompleted ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground mt-2">{progress.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
