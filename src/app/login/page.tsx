"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAppState } from "@/components/providers/app-provider";

export default function LoginPage() {
  const router = useRouter();
  const {
    copy,
    currentUser,
    isConfigured,
    isHydrated,
    language,
    login,
    toggleLanguage,
    workspaceError,
  } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usageCards =
    language === "zh"
      ? [
          {
            title: "开始一天",
            body: "到场先打卡，确认项目、位置和简短备注。",
          },
          {
            title: "开工前",
            body: "先做安全签到，把任务类型、风险和 briefing 补齐。",
          },
          {
            title: "离场前",
            body: "用条目快速补日报；发现问题就立刻记录异常并附图。",
          },
        ]
      : [
          {
            title: "Start the day",
            body: "Clock in when you arrive and confirm the project, location, and a short note.",
          },
          {
            title: "Before work",
            body: "Complete the safety check-in with task types, hazards, and the briefing topic.",
          },
          {
            title: "Before leaving",
            body: "Send a short daily report and log issues right away with item-level photos.",
          },
        ];

  useEffect(() => {
    if (isHydrated && currentUser) {
      router.replace("/attendance");
    }
  }, [currentUser, isHydrated, router]);

  if (!isHydrated) {
    return null;
  }

  const notice =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("notice") === "password-updated"
      ? language === "zh"
        ? "密码已更新，请使用新密码登录。"
        : "Your password has been updated. Sign in with the new password."
      : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? copy.login.invalidCredentials);
      return;
    }

    router.replace("/attendance");
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1fr_460px]">
        <section className="surface-ring noise-panel rounded-[36px] bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200/80 uppercase">
                TideOps
              </p>
              <h1 className="font-display mt-3 text-4xl font-semibold sm:text-5xl">
                {language === "zh" ? "现场工作台" : "Field Work Hub"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                {copy.common.brandModel}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/80"
            >
              <Languages className="h-4 w-4" />
              {copy.common.switchLanguage}
            </button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {usageCards.map((card) => (
              <div key={card.title} className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                <p className="font-display text-xl font-semibold">{card.title}</p>
                <p className="mt-3 text-sm leading-6 text-white/60">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-emerald-300/15 bg-emerald-400/10 p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-200" />
              <p className="font-medium text-emerald-100">
                {language === "zh" ? "使用建议" : "How to use TideOps"}
              </p>
            </div>
            <div className="mt-4 space-y-2 text-sm leading-6 text-white/72">
              <p>
                {language === "zh"
                  ? "1. 用一条一条的方式填写工作内容、阻碍和后续动作，后面更容易追踪。"
                  : "1. Keep entries short and itemized so the team can scan them quickly later."}
              </p>
              <p>
                {language === "zh"
                  ? "2. 照片直接挂到对应条目上，不要混在整份日报或异常说明里。"
                  : "2. Attach photos to the exact report or incident item they belong to."}
              </p>
              <p>
                {language === "zh"
                  ? "3. 备注尽量写事实和结果，少写长段技术背景，方便现场和管理都能快速看懂。"
                  : "3. Keep notes factual and short so both field and admin users can act on them quickly."}
              </p>
            </div>
          </div>
        </section>

        <section className="surface-ring rounded-[36px] bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {copy.login.eyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-slate-950">
            {copy.login.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {copy.login.description}
          </p>

          {!isConfigured ? (
            <div className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {language === "zh"
                ? "当前还不能登录，请联系管理员完成 TideOps 登录配置。"
                : "Sign-in is unavailable right now. Ask your administrator to finish the TideOps sign-in setup."}
            </div>
          ) : null}

          {workspaceError ? (
            <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {workspaceError}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
              {notice}
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {copy.login.email}
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {copy.login.password}
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
              />
            </label>

            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="text-slate-500">{copy.login.helper}</p>
              <Link
                href="/forgot-password"
                className="font-semibold text-brand transition hover:text-brand-deep"
              >
                {language === "zh" ? "忘记密码？" : "Forgot password?"}
              </Link>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!isConfigured || isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <LockKeyhole className="h-4 w-4" />
              {copy.login.signIn}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
