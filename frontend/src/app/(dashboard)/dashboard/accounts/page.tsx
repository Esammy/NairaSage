import { cookies } from "next/headers";
import { Wallet, Plus, Building2, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { djangoServerFetch, unwrapResults } from "@/lib/django-api";

export const dynamic = "force-dynamic";

type BankAccount = {
  id: number;
  institution: string;
  account_type: string;
  balance: string;
  account_number: string;
};

async function getAccounts(token: string | undefined): Promise<BankAccount[]> {
  if (!token) return [];
  try {
    const res = await djangoServerFetch("accounts", token);
    if (!res.ok) return [];
    const body = await res.json();
    return unwrapResults<BankAccount>(body);
  } catch (e) {
    console.error("Accounts fetch error", e);
    return [];
  }
}

export default async function AccountsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const accounts = await getAccounts(token);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Linked Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage connected bank accounts. Open Banking (Mono) linking will be available from the
            app once your institution connection flow is enabled on the backend.
          </p>
        </div>
        <Button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-gold-600 shadow-md shadow-gold-500/20"
          disabled
          title="Account linking API is not wired in this build"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </div>

      {accounts.length === 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-3">
          <AlertTriangle className="text-destructive w-5 h-5 shrink-0" />
          <p className="text-sm text-foreground">
            No accounts linked yet. The AI Accountant needs transaction data to categorize spending
            and track net worth accurately.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <Card
            key={acc.id}
            className="glass-card hover:border-primary/50 transition-colors group cursor-pointer border-border/50 shadow-md shadow-primary/5"
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center whitespace-break-spaces">
                <div className="flex items-center gap-2">
                  <div className="bg-secondary p-2 rounded-lg">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{acc.institution || "Bank Account"}</CardTitle>
                    <CardDescription className="capitalize">{acc.account_type || "Savings"}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  ₦{Number(acc.balance || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Connected securely • {acc.account_number || "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed border-2 border-border/50 bg-transparent hover:bg-muted/10 transition-colors flex flex-col items-center justify-center p-6 text-center min-h-[200px]">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Link an institution</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[220px]">
            When Mono (or your open-banking provider) is connected, new accounts will appear here
            automatically after sync.
          </p>
        </Card>
      </div>
    </div>
  );
}
