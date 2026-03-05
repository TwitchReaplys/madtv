import { cn } from "@/lib/utils";

type NoticeProps = {
  message?: string | null;
  variant?: "success" | "error";
};

export function Notice({ message, variant = "success" }: NoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "success"
          ? "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
          : "border-rose-300/70 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100",
      )}
    >
      {message}
    </div>
  );
}
