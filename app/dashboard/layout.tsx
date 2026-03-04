import Link from "next/link";

import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-600">Signed in as {user.email}</p>
          </div>
          <a href="/logout" className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100">
            Logout
          </a>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/dashboard" className="rounded-md bg-zinc-100 px-3 py-1.5 font-medium">
            Overview
          </Link>
          <Link href="/dashboard/creator" className="rounded-md bg-zinc-100 px-3 py-1.5 font-medium">
            Creator profile
          </Link>
          <Link href="/dashboard/tiers" className="rounded-md bg-zinc-100 px-3 py-1.5 font-medium">
            Tiers
          </Link>
          <Link href="/dashboard/posts" className="rounded-md bg-zinc-100 px-3 py-1.5 font-medium">
            Posts
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
