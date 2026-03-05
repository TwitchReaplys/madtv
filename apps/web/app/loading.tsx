import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-4 h-12 w-3/4" />
        <Skeleton className="mt-3 h-5 w-2/3" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
