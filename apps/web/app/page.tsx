import { FAQ } from "@/components/marketing/faq";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { PricingCards } from "@/components/marketing/pricing-cards";

export default function HomePage() {
  return (
    <div className="space-y-16 pb-8">
      <Hero />

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why creators choose this stack</h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Secure by default, production-ready on Coolify, and built to scale from one creator to many.
          </p>
        </div>
        <FeatureGrid />
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Flexible monetization path</h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Start simple, then layer automation with queues and worker processors as your revenue grows.
          </p>
        </div>
        <PricingCards />
      </section>

      <FAQ />
    </div>
  );
}
