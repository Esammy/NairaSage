import { cookies } from "next/headers";
import { Receipt, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { djangoServerFetch, unwrapResults } from "@/lib/django-api";

export const dynamic = "force-dynamic";

type TaxRecord = {
  id: number;
  tax_year: number;
  label: string;
  amount_ngn: string;
  record_type: string;
  notes: string;
};

type TaxDeadline = {
  id: number;
  title: string;
  due_date: string;
  is_done: boolean;
};

const RECORD_LABELS: Record<string, string> = {
  paye: "PAYE",
  vat: "VAT",
  self_assessment: "Self Assessment",
  deduction: "Deduction",
  other: "Other",
};

export default async function TaxPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  let records: TaxRecord[] = [];
  let deadlines: TaxDeadline[] = [];

  if (token) {
    const [rRes, dRes] = await Promise.all([
      djangoServerFetch("tax/records", token),
      djangoServerFetch("tax/deadlines", token),
    ]);
    if (rRes.ok) records = unwrapResults<TaxRecord>(await rRes.json());
    if (dRes.ok) deadlines = unwrapResults<TaxDeadline>(await dRes.json());
  }

  const byType: Record<string, number> = {};
  for (const r of records) {
    const amt = parseFloat(r.amount_ngn || "0");
    byType[r.record_type] = (byType[r.record_type] || 0) + amt;
  }

  const upcoming = deadlines
    .filter((d) => !d.is_done)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="w-8 h-8 text-primary" /> Tax planning
        </h1>
        <p className="text-muted-foreground mt-1">
          PAYE, VAT, and self-assessment estimates you have logged — aligned with the Tax Advisor module in
          NairaSage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Totals by type</CardTitle>
            <CardDescription>Sum of recorded amounts (NGN) for the data you have entered.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(byType).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tax records yet.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(byType).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-sm border-b border-border/40 pb-2">
                    <span>{RECORD_LABELS[k] || k}</span>
                    <span className="font-medium">₦{v.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Upcoming deadlines
            </CardTitle>
            <CardDescription>FIRS-style reminders you have saved.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open deadlines.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 8).map((d) => (
                  <li key={d.id} className="text-sm flex flex-col gap-1 border-b border-border/40 pb-2">
                    <span className="font-medium text-foreground">{d.title}</span>
                    <span className="text-muted-foreground">
                      Due {new Date(d.due_date).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle>Recent records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add records via the API or admin to populate this list.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-4">Year</th>
                    <th className="pb-2 pr-4">Label</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 25).map((r) => (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="py-2 pr-4">{r.tax_year}</td>
                      <td className="py-2 pr-4">{r.label}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{RECORD_LABELS[r.record_type] || r.record_type}</Badge>
                      </td>
                      <td className="py-2">₦{parseFloat(r.amount_ngn).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
