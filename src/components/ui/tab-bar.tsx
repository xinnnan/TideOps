"use client";

import { cn } from "@/lib/utils";

export interface TabOption {
  key: string;
  label: string;
}

interface TabBarProps {
  value: string;
  onChange: (value: string) => void;
  tabs: TabOption[];
  className?: string;
}

export function TabBar({ value, onChange, tabs, className }: TabBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 rounded-[28px] border border-slate-200 bg-white p-2",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
              active
                ? "bg-slate-950 text-white"
                : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
