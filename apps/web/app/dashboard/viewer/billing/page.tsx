import { BillingPortalButton } from "@/components/billing-portal-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function ViewerBillingPage() {
  await requireDashboardUser();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-zinc-200/70 bg-gradient-to-r from-[var(--accent)]/10 via-sky-500/6 to-transparent dark:border-zinc-800">
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Otevři Stripe portál pro správu plateb, karet a členství.
        </p>
        <BillingPortalButton />
      </CardContent>
    </Card>
  );
}
