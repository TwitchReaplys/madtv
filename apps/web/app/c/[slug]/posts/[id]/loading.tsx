import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorPostLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/3" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="mt-6 aspect-video w-full rounded-xl" />
      </div>
    </div>
  );
}
