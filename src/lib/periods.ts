import type { Language } from "@/lib/i18n";

export type SummaryScope = "week" | "month";

function toLocalDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getPeriodStart(anchor: Date, scope: SummaryScope) {
  const date = toLocalDate(anchor);

  if (scope === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

export function getPeriodEnd(anchor: Date, scope: SummaryScope) {
  const start = getPeriodStart(anchor, scope);

  if (scope === "month") {
    return new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function shiftPeriod(anchor: Date, scope: SummaryScope, direction: -1 | 1) {
  const shifted = toLocalDate(anchor);

  if (scope === "month") {
    shifted.setMonth(shifted.getMonth() + direction);
    return shifted;
  }

  shifted.setDate(shifted.getDate() + direction * 7);
  return shifted;
}

export function isDateInPeriod(value: string, anchor: Date, scope: SummaryScope) {
  const date = new Date(`${value}T00:00:00`);
  const start = getPeriodStart(anchor, scope);
  const end = getPeriodEnd(anchor, scope);

  return date >= start && date <= end;
}

export function formatPeriodLabel(anchor: Date, scope: SummaryScope, language: Language) {
  const start = getPeriodStart(anchor, scope);
  const end = getPeriodEnd(anchor, scope);
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (scope === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(start);
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
