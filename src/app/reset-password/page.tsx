"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Languages } from "lucide-react";
import { useAppState } from "@/components/providers/app-provider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const {
    currentUser,
    isConfigured,
    isHydrated,
    isLoading,
    language,
    logout,
    sessionUserId,
    toggleLanguage,
    updateCurrentUserPassword,
  } = useAppState();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isHydrated) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(
        language === "zh"
          ? "新密码至少需要 8 位。"
          : "Use at least 8 characters for the new password.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        language === "zh" ? "两次输入的密码不一致。" : "The two password fields do not match.",
      );
      return;
    }

    setIsSubmitting(true);
    const result = await updateCurrentUserPassword(password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(
        result.error ??
          (language === "zh"
            ? "暂时无法更新密码，请重新打开邮件里的链接后再试。"
            : "The password could not be updated right now. Open the email link again and retry."),
      );
      return;
    }

    await logout();
    router.replace("/login?notice=password-updated");
  }

  const canReset = Boolean(sessionUserId);

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
                {language === "zh" ? "设置新密码" : "Set a new password"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                {language === "zh"
                  ? "重置成功后，请用新密码重新登录 TideOps。"
                  : "Once the password is updated, sign in to TideOps again with the new password."}
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

          <div className="mt-10 rounded-[28px] border border-white/10 bg-white/6 p-5">
            <p className="font-display text-xl font-semibold">
              {language === "zh" ? "使用建议" : "Tips"}
            </p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-white/68">
              <p>
                {language === "zh"
                  ? "1. 建议使用只有你自己知道的新密码。"
                  : "1. Use a new password that only you know."}
              </p>
              <p>
                {language === "zh"
                  ? "2. 修改完成后，旧密码将不再可用。"
                  : "2. The old password will stop working after this change."}
              </p>
              <p>
                {language === "zh"
                  ? "3. 如果这个链接已经失效，请回到登录页重新发起忘记密码。"
                  : "3. If this link has expired, go back and request another reset email."}
              </p>
            </div>
          </div>
        </section>

        <section className="surface-ring rounded-[36px] bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                {language === "zh" ? "密码重置" : "Password reset"}
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-slate-950">
                {language === "zh" ? "输入新密码" : "Enter a new password"}
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

          {!isConfigured ? (
            <div className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {language === "zh"
                ? "当前还不能修改密码，请联系管理员完成 TideOps 登录配置。"
                : "Password update is unavailable right now. Ask your administrator to finish TideOps sign-in setup."}
            </div>
          ) : null}

          {isLoading && !canReset ? (
            <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              {language === "zh"
                ? "正在检查重置链接，请稍候。"
                : "Checking the reset link. Please wait a moment."}
            </div>
          ) : null}

          {!isLoading && !canReset ? (
            <div className="mt-8 space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm leading-7 text-slate-600">
                {language === "zh"
                  ? "当前没有可用的重置会话。请重新打开邮件里的链接，或重新发送一封重置邮件。"
                  : "There is no active password reset session right now. Open the link from the email again or request a new reset email."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {language === "zh" ? "重新发送重置邮件" : "Request another reset email"}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                >
                  {language === "zh" ? "回到登录" : "Back to sign in"}
                </Link>
              </div>
            </div>
          ) : null}

          {canReset ? (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {language === "zh"
                  ? `当前正在为 ${currentUser?.email ?? "这个账号"} 设置新密码。`
                  : `You are setting a new password for ${currentUser?.email ?? "this account"}.`}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {language === "zh" ? "新密码" : "New password"}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {language === "zh" ? "确认新密码" : "Confirm new password"}
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
                />
              </label>

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
                <KeyRound className="h-4 w-4" />
                {language === "zh" ? "更新密码" : "Update password"}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
