"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/components/providers/app-provider";

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    copy,
    currentUser,
    isConfigured,
    isHydrated,
    isLoading,
    language,
    sessionUserId,
    workspaceError,
  } = useAppState();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isConfigured) {
      router.replace("/login");
      return;
    }

    if (!sessionUserId && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isConfigured, isHydrated, pathname, router, sessionUserId]);

  const shouldShowBootLoading =
    !isHydrated || (isLoading && !sessionUserId && !currentUser) || (isLoading && !!sessionUserId && !currentUser);

  if (shouldShowBootLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="surface-ring rounded-[32px] bg-white px-8 py-10 text-center">
          <p className="font-display text-2xl font-semibold text-slate-950">
            {copy.common.loading}
          </p>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return null;
  }

  if (sessionUserId && !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="surface-ring max-w-xl rounded-[32px] bg-white p-8 text-center">
          <p className="font-display text-3xl font-semibold text-slate-950">
            {language === "zh" ? "账号还没有完成启用" : "Account setup is not complete"}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {workspaceError ??
              (language === "zh"
                ? "账号已经创建，但 TideOps 里的资料还没有准备好，请联系运营经理处理。"
                : "The account exists, but the TideOps profile is not ready yet. Ask an operations manager to finish setup.")}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {copy.login.signIn}
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionUserId) {
    return null;
  }

  return <>{children}</>;
}
