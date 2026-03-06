import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextParam = params.next;
  const nextPath =
    typeof nextParam === "string" && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-md items-center">
      <div className="absolute left-0 top-2 hidden text-xl font-bold text-gradient sm:block">
        <Link href="/">MadTV</Link>
      </div>
      <div className="absolute right-0 top-0">
        <ThemeToggle />
      </div>

      <div className="w-full space-y-4">
        <LoginForm nextPath={nextPath} />
        <p className="text-center text-sm text-zinc-500">
          Chceš se nejdřív rozhlédnout?{" "}
          <Link href="/" className="font-medium text-[var(--accent)] hover:underline">
            Zpět na úvod
          </Link>
        </p>
      </div>
    </div>
  );
}
