import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--accent)]/10 text-[var(--accent)]",
        secondary: "border-transparent bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
        outline: "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200",
        destructive: "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
