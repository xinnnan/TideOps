import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const toneMap = {
  brand: "bg-brand text-white",
  signal: "bg-signal text-white",
  accent: "bg-accent text-white",
  danger: "bg-danger text-white",
};

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  tone?: keyof typeof toneMap;
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "brand",
}: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <span
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
              toneMap[tone],
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <div className="font-display text-4xl font-semibold text-slate-950">
          {value}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{detail}</p>
      </CardContent>
    </Card>
  );
}
