export function formatCurrency(amountCents: number | null | undefined, currency: string | null | undefined) {
  if (typeof amountCents !== "number" || !currency) {
    return "Price coming soon";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function formatPostDate(isoString: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoString));
}

export function formatRelativeSeconds(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function percentage(value: number, total: number | null | undefined) {
  if (!total || total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, value / total));
}
