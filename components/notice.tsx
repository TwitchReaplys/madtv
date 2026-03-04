import clsx from "clsx";

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
      className={clsx(
        "rounded-md border px-4 py-3 text-sm",
        variant === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-rose-300 bg-rose-50 text-rose-900",
      )}
    >
      {message}
    </div>
  );
}
