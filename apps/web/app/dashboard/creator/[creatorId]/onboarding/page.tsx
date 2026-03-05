import { notFound } from "next/navigation";

import { Notice } from "@/components/notice";
import {
  refreshStripeConnectStatusAction,
  startStripeConnectOnboardingAction,
  upsertCreatorOnboardingAction,
} from "@/lib/actions/dashboard";
import { requireCreatorAccess } from "@/lib/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function isStepDone(value: boolean) {
  return value ? "Hotovo" : "Čeká";
}

export default async function CreatorOnboardingPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const query = await searchParams;
  const success = typeof query.success === "string" ? query.success : null;
  const error = typeof query.error === "string" ? query.error : null;
  const stripeState = typeof query.stripe === "string" ? query.stripe : null;

  const { supabase, user } = await requireCreatorAccess(creatorId);

  const { data: creator } = await supabase
    .from("creators")
    .select(
      "id, slug, title, status, onboarding_status, onboarding_submitted_at, onboarding_email_verified_at, legal_full_name, legal_business_id, contact_email, contact_phone, address_line1, address_line2, address_city, address_postal_code, address_country, content_focus, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted",
    )
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator) {
    notFound();
  }

  const emailVerifiedAt =
    creator.onboarding_email_verified_at ??
    user.email_confirmed_at ??
    (user as { confirmed_at?: string | null }).confirmed_at ??
    null;

  const identityStepDone = Boolean(
    creator.legal_full_name &&
      creator.legal_business_id &&
      creator.contact_email &&
      creator.contact_phone &&
      creator.address_line1 &&
      creator.address_city &&
      creator.address_postal_code &&
      creator.address_country &&
      creator.content_focus,
  );

  const emailStepDone = Boolean(emailVerifiedAt);
  const stripeStepDone = Boolean(creator.stripe_connect_payouts_enabled && creator.stripe_connect_details_submitted);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Creator onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Notice message={success} variant="success" />
          <Notice message={error} variant="error" />
          {stripeState === "return" ? (
            <Notice message="Stripe onboarding dokončen. Klikni na kontrolu Stripe stavu." variant="success" />
          ) : null}
          {stripeState === "refresh" ? (
            <Notice message="Stripe onboarding byl obnoven. Pokračuj v dokončení formuláře na Stripe." variant="error" />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Profil: {creator.title}</Badge>
            <Badge variant="outline">Stav profilu: {creator.status}</Badge>
            <Badge variant="outline">Onboarding: {creator.onboarding_status}</Badge>
            <Badge variant={identityStepDone ? "secondary" : "outline"}>1. Údaje: {isStepDone(identityStepDone)}</Badge>
            <Badge variant={emailStepDone ? "secondary" : "outline"}>2. Email: {isStepDone(emailStepDone)}</Badge>
            <Badge variant={stripeStepDone ? "secondary" : "outline"}>3. Stripe: {isStepDone(stripeStepDone)}</Badge>
          </div>

          {emailStepDone ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-300">Email ověřen: {new Date(emailVerifiedAt!).toLocaleString()}</p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              Email není ověřen. Doporučeno dokončit ověření, ale Stripe onboarding může pokračovat.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1) Identifikační údaje tvůrce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={upsertCreatorOnboardingAction} className="space-y-4">
            <input type="hidden" name="creatorId" value={creatorId} />
            <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/onboarding`} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Slug</label>
                <Input name="slug" required defaultValue={creator.slug} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Název profilu</label>
                <Input name="title" required defaultValue={creator.title} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Jméno / obchodní název</label>
                <Input name="legalFullName" required defaultValue={creator.legal_full_name ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">IČO</label>
                <Input name="legalBusinessId" required defaultValue={creator.legal_business_id ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Kontaktní email</label>
                <Input name="contactEmail" type="email" required defaultValue={creator.contact_email ?? user.email ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mobil</label>
                <Input name="contactPhone" required defaultValue={creator.contact_phone ?? ""} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Ulice a číslo</label>
                <Input name="addressLine1" required defaultValue={creator.address_line1 ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Doplňující adresa</label>
                <Input name="addressLine2" defaultValue={creator.address_line2 ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Město</label>
                <Input name="addressCity" required defaultValue={creator.address_city ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">PSČ</label>
                <Input name="addressPostalCode" required defaultValue={creator.address_postal_code ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Země (ISO-2)</label>
                <Input name="addressCountry" required maxLength={2} defaultValue={creator.address_country ?? "CZ"} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Zaměření videí</label>
              <Textarea
                name="contentFocus"
                rows={5}
                required
                defaultValue={creator.content_focus ?? ""}
                placeholder="Jaký obsah budeš na platformě tvořit?"
              />
            </div>

            <Button type="submit">Uložit onboarding údaje</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2) Ověření emailu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          <p>
            Ověření je převzaté z účtu. Pokud není email ověřený, otevři profil účtu a dokonči verifikaci přes odkaz
            v emailu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={emailStepDone ? "secondary" : "outline"}>{emailStepDone ? "Ověřeno" : "Neověřeno"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3) Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Napoj Stripe Connect účet platformy. Po dokončení se vrátíš zpět a klikneš na kontrolu stavu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Account: {creator.stripe_connect_account_id ?? "not connected"}
            </Badge>
            <Badge variant={creator.stripe_connect_details_submitted ? "secondary" : "outline"}>
              details_submitted: {String(Boolean(creator.stripe_connect_details_submitted))}
            </Badge>
            <Badge variant={creator.stripe_connect_payouts_enabled ? "secondary" : "outline"}>
              payouts_enabled: {String(Boolean(creator.stripe_connect_payouts_enabled))}
            </Badge>
            <Badge variant={creator.stripe_connect_charges_enabled ? "secondary" : "outline"}>
              charges_enabled: {String(Boolean(creator.stripe_connect_charges_enabled))}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={startStripeConnectOnboardingAction}>
              <input type="hidden" name="creatorId" value={creatorId} />
              <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/onboarding`} />
              <Button type="submit">Napojit Stripe Connect</Button>
            </form>

            <form action={refreshStripeConnectStatusAction}>
              <input type="hidden" name="creatorId" value={creatorId} />
              <input type="hidden" name="returnPath" value={`/dashboard/creator/${creatorId}/onboarding`} />
              <Button type="submit" variant="outline">Zkontrolovat Stripe stav</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
