"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function BillingPortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenPortal() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal");
        setPending(false);
        return;
      }

      window.location.href = data.url;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected error");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleOpenPortal} disabled={pending} variant="outline">
        {pending ? "Opening..." : "Manage billing"}
      </Button>
      {error ? <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
