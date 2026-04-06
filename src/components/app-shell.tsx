"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardPlus,
  Clock3,
  Languages,
  LogOut,
  PanelLeft,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { useAppState } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";

const navConfig = [
  { href: "/attendance", key: "attendance", icon: Clock3 },
  { href: "/safety", key: "safety", icon: ShieldCheck },
  { href: "/report", key: "report", icon: ClipboardPlus },
  { href: "/incident", key: "incident", icon: Siren },
  { href: "/admin", key: "admin", icon: PanelLeft },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { companies, copy, currentUser, language, logout, toggleLanguage } =
    useAppState();

  const todayLabel = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="relative min-h-screen pb-28 lg:pb-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="surface-ring sticky top-4 hidden h-[calc(100vh-2rem)] w-[320px] flex-col rounded-[32px] bg-slate-950 px-6 py-6 text-white lg:flex">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200/80 uppercase">
                {copy.appName}
              </p>
              <h1 className="font-display mt-2 text-3xl font-semibold">
                {language === "zh" ? "现场工作台" : "Field Work Hub"}
              </h1>
            </div>
            <p className="text-sm leading-6 text-white/70">{copy.common.brandModel}</p>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navConfig.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "text-white"
                      : "text-white/72 hover:bg-white/8 hover:text-white",
                  )}
                >
                  {active ? (
                    <span className="absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-brand" />
                  ) : null}
                  <Icon className="h-4 w-4" />
                  <span>{copy.nav[item.key]}</span>
                </Link>
              );
            })}
          </nav>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">
                  {todayLabel}
                </p>
                <p className="mt-2 font-display text-xl font-semibold text-white">
                  {currentUser?.fullName}
                </p>
                <p className="mt-1 text-sm text-white/55">
                  {currentUser ? copy.roles[currentUser.role] : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/14"
              >
                <Languages className="h-3.5 w-3.5" />
                {copy.common.switchLanguage}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {companies.slice(0, 4).map((company) => (
                <div
                  key={company.id}
                  className="rounded-2xl border border-white/10 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: company.primaryColor ?? "#94a3b8" }}
                    />
                    <p className="font-medium">{company.name}</p>
                  </div>
                  {company.brandLine ? (
                    <p className="mt-2 text-xs text-white/55">{company.brandLine}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              {copy.common.signOut}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between rounded-[28px] border border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                {copy.appName}
              </p>
              <p className="font-display text-lg font-semibold text-slate-950">
                {currentUser?.fullName}
              </p>
              <p className="text-sm text-slate-500">
                {currentUser ? copy.roles[currentUser.role] : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-2 text-xs font-semibold text-slate-950 ring-1 ring-brand/20"
              >
                <Languages className="h-3.5 w-3.5" />
                {copy.common.switchLanguage}
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                {copy.common.signOut}
              </button>
            </div>
          </div>

          <main>{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-50 rounded-[28px] border border-white/80 bg-slate-950 px-3 py-3 text-white shadow-2xl lg:hidden">
        <div className="grid grid-cols-5 gap-2">
          {navConfig.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                  active
                    ? "text-white"
                    : "text-white/72 hover:bg-white/8",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-8 rounded-full transition",
                    active ? "bg-brand" : "bg-transparent",
                  )}
                />
                <Icon className="h-4 w-4" />
                <span>{copy.nav[item.key]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
