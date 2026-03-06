"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type SubscribeButtonProps = {
  tierId: string;
};

export function SubscribeButton({ tierId }: SubscribeButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tierId }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Nepodařilo se spustit platbu");
        setPending(false);
        return;
      }

      window.location.href = data.url;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Neočekávaná chyba");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleSubscribe} disabled={pending} className="w-full">
        {pending ? "Přesměrování..." : "Odebírat"}
      </Button>
      {error ? <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
