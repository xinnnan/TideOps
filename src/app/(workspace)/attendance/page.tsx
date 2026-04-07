"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { useAppState } from "@/components/providers/app-provider";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardEyebrow,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabBar } from "@/components/ui/tab-bar";
import { formatPeriodLabel, isDateInPeriod, shiftPeriod, type SummaryScope } from "@/lib/periods";
import {
  extractTimeInputValue,
  formatDisplayDate,
  formatDisplayTime,
} from "@/lib/utils";

type AttendanceView = "session" | "leave" | "summary";

function getAttendanceLabel(status: string, language: "en" | "zh") {
  const labels = {
    present: { en: "Present", zh: "正常" },
    partial: { en: "Clocked in", zh: "已上班打卡" },
    missing_clock_out: { en: "Missing clock out", zh: "缺少下班卡" },
    missing_clock_in: { en: "Missing clock in", zh: "缺少上班卡" },
    leave: { en: "Leave", zh: "请假" },
  } as const;

  return labels[status as keyof typeof labels]?.[language] ?? status;
}

function getLeaveLabel(status: string, language: "en" | "zh") {
  const labels = {
    draft: { en: "Draft", zh: "草稿" },
    submitted: { en: "Submitted", zh: "已提交" },
    approved: { en: "Approved", zh: "已批准" },
    rejected: { en: "Rejected", zh: "已拒绝" },
    cancelled: { en: "Cancelled", zh: "已取消" },
  } as const;

  return labels[status as keyof typeof labels]?.[language] ?? status;
}

function getLeaveTypeLabel(type: string, language: "en" | "zh") {
  const labels = {
    vacation: { en: "Vacation", zh: "年假" },
    sick: { en: "Sick", zh: "病假" },
    personal: { en: "Personal", zh: "事假" },
    unpaid: { en: "Unpaid", zh: "无薪假" },
    other: { en: "Other", zh: "其他" },
  } as const;

  return labels[type as keyof typeof labels]?.[language] ?? type;
}

export default function AttendancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    attendanceLogs,
    clockIn,
    clockOut,
    copy,
    currentUser,
    deleteAttendanceLog,
    isOperationsManager,
    language,
    leaveRequests,
    profiles,
    projects,
    projectAssignments,
    reviewLeave,
    submitLeave,
    updateAttendanceLog,
  } = useAppState();
  const [projectId, setProjectId] = useState(
    projectAssignments.find((item) => item.userId === currentUser?.id && item.active)
      ?.projectId ?? projects[0]?.id ?? "",
  );
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("Main entry gate");
  const [feedback, setFeedback] = useState("");
  const [summaryScope, setSummaryScope] = useState<SummaryScope>("week");
  const [summaryAnchor, setSummaryAnchor] = useState(new Date());
  const leaveType = "unpaid" as const;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partialDay, setPartialDay] = useState(false);
  const [reason, setReason] = useState("");
  const [managerComments, setManagerComments] = useState<Record<string, string>>({});
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editingAttendanceUserId, setEditingAttendanceUserId] = useState<string | null>(null);
  const [editingAttendanceDate, setEditingAttendanceDate] = useState("");
  const [editingAttendanceProjectId, setEditingAttendanceProjectId] = useState("");
  const [editingClockInTime, setEditingClockInTime] = useState("");
  const [editingClockOutTime, setEditingClockOutTime] = useState("");
  const [editingClockInLocation, setEditingClockInLocation] = useState("");
  const [editingClockOutLocation, setEditingClockOutLocation] = useState("");
  const [editingAttendanceNote, setEditingAttendanceNote] = useState("");

  const viewOptions = isOperationsManager
    ? [
        { key: "session", label: language === "zh" ? "打卡" : "Session" },
        { key: "leave", label: language === "zh" ? "请假" : "Leave" },
        { key: "summary", label: language === "zh" ? "汇总" : "Summary" },
      ]
    : [
        { key: "session", label: language === "zh" ? "打卡" : "Session" },
        { key: "leave", label: language === "zh" ? "请假" : "Leave" },
      ];
  const requestedView = searchParams.get("tab");
  const activeView: AttendanceView =
    viewOptions.some((option) => option.key === requestedView)
      ? (requestedView as AttendanceView)
      : "session";
  const todayIso = new Date().toISOString().slice(0, 10);

  const myLogs = useMemo(
    () =>
      attendanceLogs
        .filter((log) => log.userId === currentUser?.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [attendanceLogs, currentUser?.id],
  );
  const myLeaveRequests = useMemo(
    () =>
      leaveRequests
        .filter((request) => request.requesterUserId === currentUser?.id)
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [currentUser?.id, leaveRequests],
  );
  const todayLog = myLogs.find((log) => log.date === todayIso);
  const approvalQueue = leaveRequests.filter((request) => request.status === "submitted");
  const exceptionLogs = attendanceLogs.filter((log) =>
    ["missing_clock_out", "missing_clock_in"].includes(log.attendanceStatus),
  );
  const recentTeamLogs = useMemo(
    () => attendanceLogs.slice(0, 12),
    [attendanceLogs],
  );

  const openSessions = attendanceLogs.filter(
    (log) => log.clockInTime && !log.clockOutTime,
  ).length;
  const workedDays = myLogs.filter((log) => log.attendanceStatus === "present").length;
  const exceptionCount = attendanceLogs.filter((log) =>
    ["missing_clock_out", "missing_clock_in"].includes(log.attendanceStatus),
  ).length;
  const summaryLogs = attendanceLogs.filter((log) =>
    isDateInPeriod(log.date, summaryAnchor, summaryScope),
  );
  const summaryUsers = profiles
    .filter((profile) => profile.status !== "inactive")
    .map((profile) => {
      const userLogs = summaryLogs.filter((log) => log.userId === profile.id);
      const latestLog = [...userLogs].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

      return {
        profile,
        total: userLogs.length,
        present: userLogs.filter((log) => log.attendanceStatus === "present").length,
        leave: userLogs.filter((log) => log.attendanceStatus === "leave").length,
        exceptions: userLogs.filter((log) =>
          ["missing_clock_out", "missing_clock_in"].includes(log.attendanceStatus),
        ).length,
        lastProject: latestLog?.projectId
          ? projects.find((project) => project.id === latestLog.projectId)?.name ??
            latestLog.projectId
          : "--",
      };
    })
    .filter((entry) => entry.total > 0 || entry.profile.role === "service_engineer")
    .sort((a, b) => b.total - a.total || a.profile.fullName.localeCompare(b.profile.fullName));
  const activePeople = new Set(summaryLogs.map((log) => log.userId)).size;
  const presentDays = summaryLogs.filter((log) => log.attendanceStatus === "present").length;
  const leaveDays = summaryLogs.filter((log) => log.attendanceStatus === "leave").length;
  const exceptionDays = summaryLogs.filter((log) =>
    ["missing_clock_out", "missing_clock_in"].includes(log.attendanceStatus),
  ).length;

  function handleViewChange(nextView: AttendanceView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleClockIn() {
    const result = await clockIn({ projectId, note, location });
    setFeedback(
      result.ok
        ? language === "zh"
          ? "已上班打卡。记得离场前完成下班打卡。"
          : "Clocked in. Remember to clock out before you leave."
        : result.error ?? "",
    );
    if (result.ok) {
      setNote("");
    }
  }

  async function handleClockOut() {
    const result = await clockOut({ note, location });
    setFeedback(result.ok ? copy.attendance.clockedOut : result.error ?? "");
    if (result.ok) {
      setNote("");
    }
  }

  async function handleLeaveSubmit() {
    const result = await submitLeave({
      leaveType,
      startDate,
      endDate,
      partialDay,
      reason,
    });

    if (!result.ok) {
      setFeedback(result.error ?? "");
      return;
    }

    setFeedback(copy.leave.submitSuccess);
    setStartDate("");
    setEndDate("");
    setReason("");
    setPartialDay(false);
  }

  async function handleLeaveReview(
    requestId: string,
    status: "approved" | "rejected",
  ) {
    const result = await reviewLeave(requestId, status, managerComments[requestId] ?? "");
    setFeedback(result.ok ? copy.leave.reviewSuccess : result.error ?? "");
  }

  async function handleDeleteAttendanceLog(logId: string) {
    const confirmed = window.confirm(
      language === "zh"
        ? "确认删除这条考勤记录？此操作无法撤销。"
        : "Delete this attendance record? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteAttendanceLog(logId);
    setFeedback(
      result.ok
        ? language === "zh"
          ? "考勤记录已删除。"
          : "Attendance record deleted."
        : result.error ?? "",
    );
  }

  function resetAttendanceEdit() {
    setEditingAttendanceId(null);
    setEditingAttendanceUserId(null);
    setEditingAttendanceDate("");
    setEditingAttendanceProjectId("");
    setEditingClockInTime("");
    setEditingClockOutTime("");
    setEditingClockInLocation("");
    setEditingClockOutLocation("");
    setEditingAttendanceNote("");
  }

  function startEditingAttendance(logId: string) {
    const log = attendanceLogs.find((item) => item.id === logId);

    if (!log) {
      return;
    }

    setEditingAttendanceId(log.id);
    setEditingAttendanceUserId(log.userId);
    setEditingAttendanceDate(log.date);
    setEditingAttendanceProjectId(log.projectId ?? projects[0]?.id ?? "");
    setEditingClockInTime(extractTimeInputValue(log.clockInTime));
    setEditingClockOutTime(extractTimeInputValue(log.clockOutTime));
    setEditingClockInLocation(log.clockInLocation ?? "");
    setEditingClockOutLocation(log.clockOutLocation ?? "");
    setEditingAttendanceNote(log.note ?? "");
    setFeedback(
      language === "zh"
        ? "正在编辑考勤记录。"
        : "Editing attendance record.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAttendanceEditSave() {
    if (!editingAttendanceId) {
      return;
    }

    const result = await updateAttendanceLog({
      id: editingAttendanceId,
      projectId: editingAttendanceProjectId,
      date: editingAttendanceDate,
      clockInTime: editingClockInTime,
      clockOutTime: editingClockOutTime,
      clockInLocation: editingClockInLocation,
      clockOutLocation: editingClockOutLocation,
      note: editingAttendanceNote,
    });

    if (!result.ok) {
      setFeedback(result.error ?? "");
      return;
    }

    setFeedback(
      language === "zh"
        ? "考勤记录已更新。"
        : "Attendance record updated.",
    );
    resetAttendanceEdit();
  }

  return (
    <div className="space-y-6 py-2">
      <PageHeader
        eyebrow={copy.nav.attendance}
        title={copy.attendance.title}
        description={copy.attendance.description}
        badges={[
          {
            label: language === "zh" ? "先打卡再开工" : "Clock in first",
            tone: "brand",
          },
          {
            label: isOperationsManager
              ? copy.roles.operations_manager
              : copy.roles.service_engineer,
            tone: "signal",
          },
        ]}
      />

      <TabBar
        value={activeView}
        onChange={(value) => handleViewChange(value as AttendanceView)}
        tabs={viewOptions as { key: string; label: string }[]}
      />

      {feedback ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      {activeView === "session" ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {isOperationsManager ? (
              <>
                <MetricCard
                  label={copy.today.clockedInEngineers}
                  value={String(openSessions)}
                  detail={
                    language === "zh"
                      ? "当前仍在现场中的打卡人数。"
                      : "People who are still clocked in on site."
                  }
                  tone="brand"
                />
                <MetricCard
                  label={copy.nav.attendance}
                  value={String(workedDays)}
                  detail={copy.attendance.myHistory}
                  tone="signal"
                />
                <MetricCard
                  label={copy.attendance.teamExceptions}
                  value={String(exceptionCount)}
                  detail={copy.attendance.managerNote}
                  tone="danger"
                />
              </>
            ) : (
              <>
                <MetricCard
                  label={copy.common.status}
                  value={
                    todayLog?.clockOutTime ? "Done" : todayLog?.clockInTime ? "Open" : "--"
                  }
                  detail={
                    todayLog
                      ? getAttendanceLabel(todayLog.attendanceStatus, language)
                      : copy.common.noData
                  }
                  tone="brand"
                />
                <MetricCard
                  label={copy.nav.attendance}
                  value={String(workedDays)}
                  detail={copy.attendance.myHistory}
                  tone="signal"
                />
                <MetricCard
                  label={copy.nav.leave}
                  value={String(myLeaveRequests.length)}
                  detail={copy.leave.requestList}
                  tone="accent"
                />
              </>
            )}
            <MetricCard
              label={language === "zh" ? "今日项目" : "Today's project"}
              value={
                projects.find((project) => project.id === (todayLog?.projectId ?? projectId))
                  ?.name ?? "--"
              }
              detail={copy.attendance.currentSession}
              tone="accent"
            />
          </section>

          <section
            className={
              isOperationsManager
                ? "grid gap-4 xl:grid-cols-[1.05fr_0.95fr]"
                : "grid gap-4"
            }
          >
            <Card className="bg-slate-950 text-white">
              <CardHeader>
                <CardEyebrow className="text-white/50">
                  {copy.attendance.currentSession}
                </CardEyebrow>
                <CardTitle className="text-white">
                  {projects.find((project) => project.id === projectId)?.name}
                </CardTitle>
                <CardDescription className="text-white/70">
                  {todayLog?.clockInTime
                    ? `${copy.attendance.clockedIn} ${formatDisplayTime(
                        todayLog.clockInTime,
                        language,
                      )}`
                    : copy.attendance.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">{copy.attendance.project}</span>
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id} className="text-slate-950">
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">{copy.attendance.location}</span>
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">{copy.attendance.note}</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleClockIn()}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
                  >
                    {copy.attendance.clockIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClockOut()}
                    className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white"
                  >
                    {copy.attendance.clockOut}
                  </button>
                </div>
                {todayLog ? (
                  <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
                    <div className="flex items-center gap-2 text-sm text-white/75">
                      <MapPin className="h-4 w-4" />
                      <span>{todayLog.clockInLocation ?? location}</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {isOperationsManager ? (
              <Card>
                <CardHeader>
                  <CardEyebrow>{copy.attendance.teamExceptions}</CardEyebrow>
                  <CardTitle>{copy.attendance.teamExceptions}</CardTitle>
                  <CardDescription>{copy.attendance.managerNote}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exceptionLogs.length === 0 ? (
                    <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      {copy.common.noData}
                    </div>
                  ) : (
                    exceptionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[24px] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {profiles.find((profile) => profile.id === log.userId)?.fullName ??
                                log.userId}
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatDisplayDate(log.date, language)} ·{" "}
                              {projects.find((project) => project.id === log.projectId)?.name}
                            </p>
                          </div>
                          <Badge tone="danger">
                            {getAttendanceLabel(log.attendanceStatus, language)}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{log.note || "--"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : null}
          </section>

          {editingAttendanceId ? (
            <Card>
              <CardHeader>
                <CardEyebrow>
                  {language === "zh" ? "编辑考勤记录" : "Edit attendance"}
                </CardEyebrow>
                <CardTitle>
                  {language === "zh" ? "编辑考勤记录" : "Edit attendance"}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? `修改时间、位置或备注。${editingAttendanceUserId !== currentUser?.id ? "当前正在代他人修正记录。" : ""}`
                    : `Adjust time, location, or note.${editingAttendanceUserId !== currentUser?.id ? " You are editing another user's record." : ""}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block space-y-2 xl:col-span-2">
                    <span className="text-sm font-medium text-slate-700">
                      {copy.attendance.project}
                    </span>
                    <select
                      value={editingAttendanceProjectId}
                      onChange={(event) => setEditingAttendanceProjectId(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "日期" : "Date"}
                    </span>
                    <input
                      type="date"
                      value={editingAttendanceDate}
                      onChange={(event) => setEditingAttendanceDate(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {copy.common.status}
                    </span>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {language === "zh"
                        ? "保存后会根据上下班时间自动刷新状态。"
                        : "Status will refresh automatically after save based on the times below."}
                    </div>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "上班时间" : "Clock-in time"}
                    </span>
                    <input
                      type="time"
                      value={editingClockInTime}
                      onChange={(event) => setEditingClockInTime(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "下班时间" : "Clock-out time"}
                    </span>
                    <input
                      type="time"
                      value={editingClockOutTime}
                      onChange={(event) => setEditingClockOutTime(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "上班位置" : "Clock-in location"}
                    </span>
                    <input
                      value={editingClockInLocation}
                      onChange={(event) => setEditingClockInLocation(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "下班位置" : "Clock-out location"}
                    </span>
                    <input
                      value={editingClockOutLocation}
                      onChange={(event) => setEditingClockOutLocation(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{copy.attendance.note}</span>
                  <textarea
                    rows={3}
                    value={editingAttendanceNote}
                    onChange={(event) => setEditingAttendanceNote(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleAttendanceEditSave()}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                  >
                    {copy.common.save}
                  </button>
                  <button
                    type="button"
                    onClick={resetAttendanceEdit}
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    {copy.common.cancel}
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardEyebrow>{copy.attendance.myHistory}</CardEyebrow>
              <CardTitle>{copy.attendance.myHistory}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">{copy.attendance.project}</th>
                      <th className="px-4 py-3 font-medium">In</th>
                      <th className="px-4 py-3 font-medium">Out</th>
                      <th className="px-4 py-3 font-medium">{copy.common.status}</th>
                      <th className="px-4 py-3 font-medium">
                        {language === "zh" ? "操作" : "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {myLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                          {copy.common.noData}
                        </td>
                      </tr>
                    ) : (
                      myLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDisplayDate(log.date, language)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {projects.find((project) => project.id === log.projectId)?.name ?? "--"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDisplayTime(log.clockInTime, language)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDisplayTime(log.clockOutTime, language)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                log.attendanceStatus === "present"
                                  ? "success"
                                  : log.attendanceStatus === "partial"
                                    ? "accent"
                                    : log.attendanceStatus === "leave"
                                      ? "signal"
                                      : "danger"
                              }
                            >
                              {getAttendanceLabel(log.attendanceStatus, language)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => startEditingAttendance(log.id)}
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                            >
                              {copy.common.edit}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {isOperationsManager ? (
            <Card>
              <CardHeader>
                <CardEyebrow>
                  {language === "zh" ? "最近团队记录" : "Recent team records"}
                </CardEyebrow>
                <CardTitle>
                  {language === "zh" ? "最近团队记录" : "Recent team records"}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "运营经理可以删除错误或重复的考勤记录。"
                    : "Operations managers can remove incorrect or duplicate attendance records."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTeamLogs.length === 0 ? (
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    {copy.common.noData}
                  </div>
                ) : (
                  recentTeamLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {profiles.find((profile) => profile.id === log.userId)?.fullName ??
                              log.userId}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatDisplayDate(log.date, language)} ·{" "}
                            {projects.find((project) => project.id === log.projectId)?.name ??
                              "--"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDisplayTime(log.clockInTime, language)} -{" "}
                            {formatDisplayTime(log.clockOutTime, language)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            tone={
                              log.attendanceStatus === "present"
                                ? "success"
                                : log.attendanceStatus === "partial"
                                  ? "accent"
                                  : log.attendanceStatus === "leave"
                                    ? "signal"
                                    : "danger"
                            }
                          >
                            {getAttendanceLabel(log.attendanceStatus, language)}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => startEditingAttendance(log.id)}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            {copy.common.edit}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAttendanceLog(log.id)}
                            className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600"
                          >
                            {copy.common.delete}
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{log.note || "--"}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeView === "leave" ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={copy.leave.requestList}
              value={String(myLeaveRequests.length)}
              detail={language === "zh" ? "你自己的请假记录。" : "Your own leave requests."}
              tone="brand"
            />
            <MetricCard
              label={copy.leave.approvalQueue}
              value={String(approvalQueue.length)}
              detail={
                isOperationsManager
                  ? copy.leave.approvalQueue
                  : language === "zh"
                    ? "仅运营经理可审批。"
                    : "Only operations managers can approve."
              }
              tone="accent"
            />
            <MetricCard
              label={language === "zh" ? "已批准" : "Approved"}
              value={String(leaveRequests.filter((item) => item.status === "approved").length)}
              detail={copy.leave.reviewSuccess}
              tone="signal"
            />
            <MetricCard
              label={language === "zh" ? "已拒绝" : "Rejected"}
              value={String(leaveRequests.filter((item) => item.status === "rejected").length)}
              detail={copy.leave.comment}
              tone="danger"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="bg-slate-950 text-white">
              <CardHeader>
                <CardEyebrow className="text-white/50">{copy.leave.requestForm}</CardEyebrow>
                <CardTitle className="text-white">{copy.leave.requestForm}</CardTitle>
                <CardDescription className="text-white/70">
                  {language === "zh"
                    ? "填写请假日期和原因后提交。"
                    : "Enter the leave dates and reason, then submit."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">{copy.leave.leaveType}</span>
                  <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                    <p className="text-sm font-semibold text-white">
                      {getLeaveTypeLabel(leaveType, language)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">{copy.leave.startDate}</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">{copy.leave.endDate}</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={partialDay}
                    onChange={(event) => setPartialDay(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  <span>{copy.leave.partialDay}</span>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">{copy.leave.reason}</span>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleLeaveSubmit()}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  {copy.common.submit}
                </button>
              </CardContent>
            </Card>

            {isOperationsManager ? (
              <Card>
                <CardHeader>
                  <CardEyebrow>{copy.leave.approvalQueue}</CardEyebrow>
                  <CardTitle>{copy.leave.approvalQueue}</CardTitle>
                  <CardDescription>
                    {language === "zh"
                      ? "运营经理在这里审批请假，同时自己也可以提交请假。"
                      : "Operations managers can review leave here while still submitting their own leave."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {approvalQueue.length === 0 ? (
                    <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      {copy.common.noData}
                    </div>
                  ) : (
                    approvalQueue.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-[24px] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {profiles.find((profile) => profile.id === request.requesterUserId)
                                ?.fullName ?? request.requesterUserId}
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatDisplayDate(request.startDate, language)} -{" "}
                              {formatDisplayDate(request.endDate, language)}
                            </p>
                          </div>
                          <Badge tone="accent">{getLeaveLabel(request.status, language)}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{request.reason}</p>
                        <textarea
                          rows={3}
                          value={managerComments[request.id] ?? ""}
                          onChange={(event) =>
                            setManagerComments((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          placeholder={copy.leave.comment}
                          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                        />
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => void handleLeaveReview(request.id, "approved")}
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                          >
                            {copy.leave.approve}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleLeaveReview(request.id, "rejected")}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            {copy.leave.reject}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardEyebrow>{copy.leave.requestList}</CardEyebrow>
                  <CardTitle>{copy.leave.requestList}</CardTitle>
                  <CardDescription>{copy.leave.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-[24px] border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">{copy.leave.leaveType}</th>
                          <th className="px-4 py-3 font-medium">{copy.leave.startDate}</th>
                          <th className="px-4 py-3 font-medium">{copy.leave.endDate}</th>
                          <th className="px-4 py-3 font-medium">{copy.common.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {myLeaveRequests.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                              {copy.common.noData}
                            </td>
                          </tr>
                        ) : (
                          myLeaveRequests.map((request) => (
                            <tr key={request.id}>
                              <td className="px-4 py-3 text-slate-700">
                                {getLeaveTypeLabel(request.leaveType, language)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {formatDisplayDate(request.startDate, language)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {formatDisplayDate(request.endDate, language)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  tone={
                                    request.status === "approved"
                                      ? "success"
                                      : request.status === "submitted"
                                        ? "accent"
                                        : request.status === "rejected"
                                          ? "danger"
                                          : "neutral"
                                  }
                                >
                                  {getLeaveLabel(request.status, language)}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {isOperationsManager ? (
            <Card>
              <CardHeader>
                <CardEyebrow>{copy.leave.requestList}</CardEyebrow>
                <CardTitle>{language === "zh" ? "我的请假记录" : "My leave requests"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-[24px] border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">{copy.leave.leaveType}</th>
                        <th className="px-4 py-3 font-medium">{copy.leave.startDate}</th>
                        <th className="px-4 py-3 font-medium">{copy.leave.endDate}</th>
                        <th className="px-4 py-3 font-medium">{copy.common.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {myLeaveRequests.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                            {copy.common.noData}
                          </td>
                        </tr>
                      ) : (
                        myLeaveRequests.map((request) => (
                          <tr key={request.id}>
                            <td className="px-4 py-3 text-slate-700">
                              {getLeaveTypeLabel(request.leaveType, language)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatDisplayDate(request.startDate, language)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatDisplayDate(request.endDate, language)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                tone={
                                  request.status === "approved"
                                    ? "success"
                                    : request.status === "submitted"
                                      ? "accent"
                                      : request.status === "rejected"
                                        ? "danger"
                                        : "neutral"
                                }
                              >
                                {getLeaveLabel(request.status, language)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeView === "summary" && isOperationsManager ? (
        <>
          <Card>
            <CardHeader>
              <CardEyebrow>{language === "zh" ? "周 / 月汇总" : "Weekly / monthly summary"}</CardEyebrow>
              <CardTitle>
                {language === "zh" ? "团队出勤汇总" : "Team attendance summary"}
              </CardTitle>
              <CardDescription>
                {language === "zh"
                  ? "切换周或月视角，快速看整体人数和每位工程师的出勤情况。"
                  : "Switch between week and month views to review team coverage and each engineer's attendance."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabBar
                  value={summaryScope}
                  onChange={(value) => setSummaryScope(value as SummaryScope)}
                  tabs={[
                    { key: "week", label: language === "zh" ? "按周" : "Weekly" },
                    { key: "month", label: language === "zh" ? "按月" : "Monthly" },
                  ]}
                  className="w-auto bg-slate-50"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSummaryAnchor((current) => shiftPeriod(current, summaryScope, -1))
                    }
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {language === "zh" ? "上一段" : "Previous"}
                  </button>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    {formatPeriodLabel(summaryAnchor, summaryScope, language)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSummaryAnchor((current) => shiftPeriod(current, summaryScope, 1))
                    }
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {language === "zh" ? "下一段" : "Next"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label={language === "zh" ? "有记录人数" : "People with logs"}
                  value={String(activePeople)}
                  detail={
                    language === "zh"
                      ? "该时间段内有出勤记录的人数。"
                      : "Users with attendance logs in this period."
                  }
                  tone="brand"
                />
                <MetricCard
                  label={language === "zh" ? "正常出勤天次" : "Present days"}
                  value={String(presentDays)}
                  detail={
                    language === "zh"
                      ? "状态为正常出勤的记录数。"
                      : "Attendance records marked present."
                  }
                  tone="signal"
                />
                <MetricCard
                  label={language === "zh" ? "请假天次" : "Leave days"}
                  value={String(leaveDays)}
                  detail={
                    language === "zh"
                      ? "已批准或同步到考勤的请假记录。"
                      : "Leave records in the selected period."
                  }
                  tone="accent"
                />
                <MetricCard
                  label={language === "zh" ? "异常天次" : "Exception days"}
                  value={String(exceptionDays)}
                  detail={
                    language === "zh"
                      ? "缺少上班卡或下班卡的记录。"
                      : "Logs missing a clock-in or clock-out."
                  }
                  tone="danger"
                />
              </div>

              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        {language === "zh" ? "工程师" : "Engineer"}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {language === "zh" ? "总记录" : "Logs"}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {language === "zh" ? "正常" : "Present"}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {language === "zh" ? "请假" : "Leave"}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {language === "zh" ? "异常" : "Exceptions"}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {language === "zh" ? "最近项目" : "Latest project"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {summaryUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                          {copy.common.noData}
                        </td>
                      </tr>
                    ) : (
                      summaryUsers.map((entry) => (
                        <tr key={entry.profile.id}>
                          <td className="px-4 py-3 text-slate-700">
                            <div>
                              <p className="font-medium text-slate-900">{entry.profile.fullName}</p>
                              <p className="text-xs text-slate-500">
                                {entry.profile.role === "operations_manager"
                                  ? copy.roles.operations_manager
                                  : copy.roles.service_engineer}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{entry.total}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.present}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.leave}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.exceptions}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.lastProject}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardEyebrow>{copy.attendance.teamExceptions}</CardEyebrow>
              <CardTitle>{copy.attendance.teamExceptions}</CardTitle>
              <CardDescription>{copy.attendance.managerNote}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {exceptionLogs.length === 0 ? (
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  {copy.common.noData}
                </div>
              ) : (
                exceptionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {profiles.find((profile) => profile.id === log.userId)?.fullName ??
                            log.userId}
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatDisplayDate(log.date, language)} ·{" "}
                          {projects.find((project) => project.id === log.projectId)?.name}
                        </p>
                      </div>
                      <Badge tone="danger">
                        {getAttendanceLabel(log.attendanceStatus, language)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{log.note || "--"}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
