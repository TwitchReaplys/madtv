import Link from "next/link";

import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextParam = params.next;
  const nextPath = typeof nextParam === "string" ? nextParam : "/dashboard";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-md items-center">
      <div className="w-full space-y-4">
        <LoginForm nextPath={nextPath} />
        <p className="text-center text-xs text-zinc-500">
          Explore first? <Link href="/" className="underline">Back to landing</Link>
        </p>
      </div>
    </div>
  );
}
