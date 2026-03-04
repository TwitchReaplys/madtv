import { LoginForm } from "@/components/login-form";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextParam = params.next;
  const nextPath = typeof nextParam === "string" ? nextParam : "/dashboard";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-md items-center px-6 py-12">
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
