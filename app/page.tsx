import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <section className="rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">MVP Platform</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          Multi-creator subscription community, built with Next.js + Supabase + Stripe + Bunny Stream.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-700">
          Creators can manage tiers and gated posts. Members can subscribe and access paid content. Access control is
          enforced by Postgres RLS.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-md bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white">
            Login / Sign up
          </Link>
          <Link href="/dashboard" className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold">
            Open dashboard
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Creators</h2>
          <p className="mt-2 text-sm text-zinc-700">Create profile, publish posts, and attach Bunny videos.</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="mt-2 text-sm text-zinc-700">Subscribe through Stripe checkout and manage billing portal.</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="mt-2 text-sm text-zinc-700">Gated content is protected by database-level RLS policies.</p>
        </article>
      </section>
    </div>
  );
}
