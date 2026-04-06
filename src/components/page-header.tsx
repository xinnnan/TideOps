import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeaderAction {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  badges?: { label: string; tone?: "neutral" | "brand" | "signal" | "accent" | "danger" | "success" }[];
  actions?: HeaderAction[];
}

const actionClasses = {
  primary:
    "bg-slate-950 text-white hover:bg-slate-800",
  secondary:
    "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badges = [],
  actions = [],
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
          {eyebrow}
        </p>
        <div className="space-y-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {description}
          </p>
        </div>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge.label} tone={badge.tone}>
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition ${actionClasses[action.variant ?? "secondary"]}`}
            >
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
