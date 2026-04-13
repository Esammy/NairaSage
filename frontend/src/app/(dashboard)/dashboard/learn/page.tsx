import { GraduationCap, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const TOPICS = [
  {
    title: "Inflation and real returns",
    body: "When inflation is higher than your savings rate, cash loses purchasing power. Compare headline CPI to yields on T-bills and money market funds before leaving large balances idle.",
  },
  {
    title: "PAYE vs self-assessment",
    body: "Employees usually pay PAYE via payroll. Freelancers and business owners often owe quarterly self-assessment. Track both in the Tax module so filing season does not surprise you.",
  },
  {
    title: "Diversification",
    body: "Spread risk across cash, fixed income, equities, and (if appropriate) alternatives. Concentration in one stock, one bank, or one currency is a common wealth leak in volatile markets.",
  },
  {
    title: "Debt avalanche vs snowball",
    body: "Avalanche minimizes interest by attacking the highest APR first. Snowball builds motivation by clearing small balances first. NairaSage can show both orders — pick what you will stick to.",
  },
];

export default function LearnPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-primary" /> Learn
        </h1>
        <p className="text-muted-foreground mt-1">
          Short primers grounded in Nigerian personal finance. Adaptive curriculum and voice mode are on the
          roadmap (see product plan).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOPICS.map((t) => (
          <Card key={t.title} className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary shrink-0" />
                {t.title}
              </CardTitle>
              <CardDescription className="text-foreground/80 leading-relaxed">{t.body}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}
