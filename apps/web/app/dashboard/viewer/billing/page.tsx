import { BillingPortalButton } from "@/components/billing-portal-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDashboardUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function ViewerBillingPage() {
  await requireDashboardUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Otevři Stripe portál pro správu plateb, karet a členství.
        </p>
        <BillingPortalButton />
      </CardContent>
    </Card>
  );
}
