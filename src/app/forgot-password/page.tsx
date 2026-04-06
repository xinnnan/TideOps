"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Languages, MailCheck } from "lucide-react";
import { useAppState } from "@/components/providers/app-provider";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const {
    currentUser,
    isConfigured,
    isHydrated,
    language,
    sendPasswordResetEmail,
    toggleLanguage,
  } = useAppState();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isHydrated && currentUser) {
      router.replace("/admin?tab=account");
    }
  }, [currentUser, isHydrated, router]);

  if (!isHydrated) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const result = await sendPasswordResetEmail(email);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(
        result.error ??
          (language === "zh"
            ? "暂时无法发送重置邮件，请稍后再试。"
            : "The reset email could not be sent right now. Try again in a moment."),
      );
      return;
    }

    setSuccess(
      language === "zh"
        ? "如果该邮箱已在 TideOps 中启用，重置链接已经发出。请到邮箱里继续。"
        : "If that email is active in TideOps, a reset link is on the way. Check your inbox to continue.",
    );
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
                {language === "zh" ? "找回登录密码" : "Reset your password"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                {language === "zh"
                  ? "输入工作邮箱，我们会把重置链接发到你的邮箱。完成后再回到 TideOps 登录。"
                  : "Enter your work email and we will send a reset link. After that, come back to TideOps and sign in again."}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/80"
            >
              <Languages className="h-4 w-4" />
              {language === "zh" ? "EN" : "中文"}
            </button>
          </div>

          <div className="mt-10 space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
              <p className="font-display text-xl font-semibold">
                {language === "zh" ? "怎么操作" : "What happens next"}
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-white/68">
                <p>
                  {language === "zh"
                    ? "1. 使用你的工作邮箱发送重置请求。"
                    : "1. Send a reset request with your work email."}
                </p>
                <p>
                  {language === "zh"
                    ? "2. 在邮箱里打开 TideOps 发来的重置链接。"
                    : "2. Open the TideOps reset link from your inbox."}
                </p>
                <p>
                  {language === "zh"
                    ? "3. 设置新密码后，再回到 TideOps 登录。"
                    : "3. Set a new password, then come back and sign in."}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-300/15 bg-emerald-400/10 p-6">
              <div className="flex items-center gap-3">
                <MailCheck className="h-5 w-5 text-emerald-200" />
                <p className="font-medium text-emerald-100">
                  {language === "zh" ? "使用提醒" : "Good to know"}
                </p>
              </div>
              <div className="mt-4 space-y-2 text-sm leading-6 text-white/72">
                <p>
                  {language === "zh"
                    ? "如果你已经登录，也可以在管理页的账号页里直接修改密码。"
                    : "If you are already signed in, you can also change the password directly in Admin > Account."}
                </p>
                <p>
                  {language === "zh"
                    ? "如果几分钟后还没有收到邮件，请先检查垃圾邮件箱。"
                    : "If the message does not arrive after a few minutes, check your spam folder first."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-ring rounded-[36px] bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                {language === "zh" ? "密码帮助" : "Password help"}
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-slate-950">
                {language === "zh" ? "发送重置链接" : "Send reset link"}
              </h2>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {language === "zh" ? "返回登录" : "Back to sign in"}
            </Link>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {language === "zh"
              ? "请输入工作邮箱。我们会把重置密码的入口发到该邮箱。"
              : "Enter the work email for this account. We will send the password reset link to that inbox."}
          </p>

          {!isConfigured ? (
            <div className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {language === "zh"
                ? "当前还不能发送重置邮件，请联系管理员完成 TideOps 登录配置。"
                : "Password reset email is unavailable right now. Ask your administrator to finish TideOps sign-in setup."}
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {language === "zh" ? "工作邮箱" : "Work email"}
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!isConfigured || isSubmitting || !email.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <MailCheck className="h-4 w-4" />
              {language === "zh" ? "发送重置链接" : "Send reset link"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
