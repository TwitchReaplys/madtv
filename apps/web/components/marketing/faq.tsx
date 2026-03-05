import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faq = [
  {
    q: "How is content access protected?",
    a: "RLS policies in Postgres decide who can read posts and assets, based on subscription rank and creator admin role.",
  },
  {
    q: "Do videos upload through my server?",
    a: "No. Browser uploads directly to Bunny Stream with short-lived signed credentials from a server route.",
  },
  {
    q: "What if Stripe sends duplicate webhooks?",
    a: "Events are stored by Stripe event id and processed through a queue with idempotent upserts.",
  },
  {
    q: "Can each creator use their own brand color?",
    a: "Yes. Each creator has accent color and media fields that drive CSS variables on public pages.",
  },
];

export function FAQ() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">FAQ</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {faq.map((item) => (
          <Card key={item.q}>
            <CardHeader>
              <CardTitle className="text-base">{item.q}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{item.a}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
