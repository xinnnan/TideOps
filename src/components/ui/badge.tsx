import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "signal" | "accent" | "danger" | "success";

const toneMap: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-brand-soft text-brand",
  signal: "bg-signal-soft text-signal",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  success: "bg-emerald-100 text-emerald-700",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase",
        toneMap[tone],
        className,
      )}
      {...props}
    />
  );
}
