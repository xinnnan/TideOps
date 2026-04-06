"use client";

import { useMemo, useState } from "react";
import { NumberedListComposer } from "@/components/numbered-list-composer";
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
import { useAppState } from "@/components/providers/app-provider";
import { createDraftMediaListItem } from "@/lib/media-items";
import { exportDailyReportPdf } from "@/lib/pdf-export";
import type { MediaListItem } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

export default function ReportPage() {
  const {
    copy,
    currentUser,
    dailyReports,
    deleteDailyReport,
    isOperationsManager,
    language,
    profiles,
    projects,
    sites,
    submitDailyReport,
  } = useAppState();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [majorTasks, setMajorTasks] = useState([createDraftMediaListItem()]);
  const [blockers, setBlockers] = useState([createDraftMediaListItem()]);
  const [nextDayPlan, setNextDayPlan] = useState([createDraftMediaListItem()]);
  const [feedback, setFeedback] = useState("");
  const [feedSearch, setFeedSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const mediaCopy =
    language === "zh"
      ? {
          pickPhotoLabel: "加图",
          cameraLabel: "拍照",
          pastePhotoLabel: "粘贴图片",
          cameraReadyLabel: "摄像头已开启，对准后拍照。",
          capturePhotoLabel: "拍摄",
          closeCameraLabel: "关闭摄像头",
          cameraUnavailableLabel: "无法打开摄像头，请检查权限，或改用加图。",
        }
      : {
          pickPhotoLabel: "Add photo",
          cameraLabel: "Camera",
          pastePhotoLabel: "Paste image",
          cameraReadyLabel: "Camera is live. Frame the shot and capture it.",
          capturePhotoLabel: "Capture",
          closeCameraLabel: "Close camera",
          cameraUnavailableLabel: "Could not open the camera. Check permission or use Add photo.",
        };

  const visibleReports = useMemo(
    () =>
      isOperationsManager
        ? dailyReports
        : dailyReports.filter((report) => report.authorUserId === currentUser?.id),
    [currentUser?.id, dailyReports, isOperationsManager],
  );

  const filteredReports = useMemo(() => {
    const normalizedSearch = feedSearch.trim().toLowerCase();

    return visibleReports.filter((report) => {
      const project = projects.find((item) => item.id === report.projectId);
      const site = sites.find((item) => item.id === project?.siteId);
      const author = profiles.find((item) => item.id === report.authorUserId);
      const allText = [
        report.majorTasks,
        report.blockers,
        report.nextDayPlan,
        ...report.majorTaskItems.map((item) => item.text),
        ...report.blockerItems.map((item) => item.text),
        ...report.nextDayPlanItems.map((item) => item.text),
        project?.name ?? "",
        site?.name ?? "",
        author?.fullName ?? "",
        report.date,
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !allText.includes(normalizedSearch)) {
        return false;
      }

      if (isOperationsManager) {
        if (authorFilter && report.authorUserId !== authorFilter) {
          return false;
        }

        if (projectFilter && report.projectId !== projectFilter) {
          return false;
        }

        if (siteFilter && project?.siteId !== siteFilter) {
          return false;
        }

        if (dateFrom && report.date < dateFrom) {
          return false;
        }

        if (dateTo && report.date > dateTo) {
          return false;
        }
      }

      return true;
    });
  }, [
    authorFilter,
    dateFrom,
    dateTo,
    feedSearch,
    isOperationsManager,
    profiles,
    projectFilter,
    projects,
    siteFilter,
    sites,
    visibleReports,
  ]);

  const reportAuthors = useMemo(() => {
    const ids = Array.from(new Set(dailyReports.map((report) => report.authorUserId)));

    return profiles
      .filter((profile) => ids.includes(profile.id))
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }, [dailyReports, profiles]);

  async function handleSubmit() {
    const result = await submitDailyReport({
      projectId,
      majorTasks,
      blockers,
      nextDayPlan,
    });

    setFeedback(result.ok ? copy.report.submitSuccess : result.error ?? "");

    if (result.ok) {
      setMajorTasks([createDraftMediaListItem()]);
      setBlockers([createDraftMediaListItem()]);
      setNextDayPlan([createDraftMediaListItem()]);
    }
  }

  function renderItemList(items: MediaListItem[]) {
    return items.filter((item) => item.text.trim().length > 0 || item.attachments.length > 0);
  }

  async function handleExport(reportId: string) {
    const report = dailyReports.find((item) => item.id === reportId);

    if (!report) {
      return;
    }

    const projectName =
      projects.find((project) => project.id === report.projectId)?.name ?? report.projectId;
    const authorName =
      profiles.find((profile) => profile.id === report.authorUserId)?.fullName ??
      report.authorUserId;

    await exportDailyReportPdf({
      report,
      projectName,
      authorName,
      language,
    });
  }

  async function handleDelete(reportId: string) {
    const confirmed = window.confirm(
      language === "zh"
        ? "确认删除这条日报？此操作无法撤销。"
        : "Delete this daily report? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteDailyReport(reportId);
    setFeedback(
      result.ok
        ? language === "zh"
          ? "日报已删除。"
          : "Daily report deleted."
        : result.error ?? "",
    );
  }

  return (
    <div className="space-y-6 py-2">
      <PageHeader
        eyebrow={copy.nav.report}
        title={copy.report.title}
        description={copy.report.description}
        badges={[
          { label: copy.report.newRecord, tone: "brand" },
          { label: copy.report.reportFeed, tone: "signal" },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="bg-slate-950 text-white">
          <CardHeader>
            <CardEyebrow className="text-white/50">{copy.report.newRecord}</CardEyebrow>
            <CardTitle className="text-white">
              {projects.find((project) => project.id === projectId)?.name}
            </CardTitle>
            <CardDescription className="text-white/70">
              {language === "zh"
                ? "保留最少但最关键的日报信息：今天做了什么、有哪些阻碍风险、明天做什么。"
                : "Keep the report lean: what was done today, what risks or blockers exist, and what comes next tomorrow."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">{copy.attendance.project}</span>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="text-slate-950">
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <NumberedListComposer
              dark
              label={copy.report.majorTasks}
              helper={
                language === "zh"
                  ? "按列表逐条添加，保持现场输入简单清晰。"
                  : "Add one line at a time so field entry stays simple and clear."
              }
              items={majorTasks}
              onChange={setMajorTasks}
              placeholder={
                language === "zh"
                  ? "例如：完成机器人底座找平"
                  : "For example: Completed robot base leveling"
              }
              addLabel={language === "zh" ? "添加" : "Add"}
              emptyLabel={language === "zh" ? "还没有任务项。" : "No task items yet."}
              pickPhotoLabel={mediaCopy.pickPhotoLabel}
              cameraLabel={mediaCopy.cameraLabel}
              pastePhotoLabel={mediaCopy.pastePhotoLabel}
              cameraReadyLabel={mediaCopy.cameraReadyLabel}
              capturePhotoLabel={mediaCopy.capturePhotoLabel}
              closeCameraLabel={mediaCopy.closeCameraLabel}
              cameraUnavailableLabel={mediaCopy.cameraUnavailableLabel}
            />

            <NumberedListComposer
              dark
              label={copy.report.blockers}
              helper={
                language === "zh"
                  ? "没有风险或阻碍也可以留空。"
                  : "Leave this empty if there are no blockers or risks."
              }
              items={blockers}
              onChange={setBlockers}
              placeholder={
                language === "zh"
                  ? "例如：客户尚未释放上电窗口"
                  : "For example: Customer has not released the energization window"
              }
              addLabel={language === "zh" ? "添加" : "Add"}
              emptyLabel={
                language === "zh" ? "当前没有阻碍或风险。" : "No blockers or risks listed."
              }
              pickPhotoLabel={mediaCopy.pickPhotoLabel}
              cameraLabel={mediaCopy.cameraLabel}
              pastePhotoLabel={mediaCopy.pastePhotoLabel}
              cameraReadyLabel={mediaCopy.cameraReadyLabel}
              capturePhotoLabel={mediaCopy.capturePhotoLabel}
              closeCameraLabel={mediaCopy.closeCameraLabel}
              cameraUnavailableLabel={mediaCopy.cameraUnavailableLabel}
            />

            <NumberedListComposer
              dark
              label={copy.report.nextDayPlan}
              helper={
                language === "zh"
                  ? "明天的计划也建议按条目填写，现场更容易快速更新。"
                  : "Use short line items so tomorrow's plan can be updated quickly on site."
              }
              items={nextDayPlan}
              onChange={setNextDayPlan}
              placeholder={
                language === "zh"
                  ? "例如：完成 IO 点位复测"
                  : "For example: Finish IO point retest"
              }
              addLabel={language === "zh" ? "添加" : "Add"}
              emptyLabel={language === "zh" ? "还没有明日计划。" : "No next-day plan yet."}
              pickPhotoLabel={mediaCopy.pickPhotoLabel}
              cameraLabel={mediaCopy.cameraLabel}
              pastePhotoLabel={mediaCopy.pastePhotoLabel}
              cameraReadyLabel={mediaCopy.cameraReadyLabel}
              capturePhotoLabel={mediaCopy.capturePhotoLabel}
              closeCameraLabel={mediaCopy.closeCameraLabel}
              cameraUnavailableLabel={mediaCopy.cameraUnavailableLabel}
            />

            {feedback ? (
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white/80">
                {feedback}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
            >
              {copy.common.submit}
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardEyebrow>{copy.report.reportFeed}</CardEyebrow>
            <CardTitle>{copy.report.reportFeed}</CardTitle>
            <CardDescription>
              {isOperationsManager
                ? language === "zh"
                  ? "可查看全量日报，并按工程师、项目、站点和日期筛选。"
                  : "Review all reports and filter by engineer, project, site, and date."
                : language === "zh"
                  ? "这里只显示你自己的日报记录。"
                  : "Only your own reports are shown here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {language === "zh" ? "搜索内容 / 项目 / 站点" : "Search content / project / site"}
                </span>
                <input
                  type="search"
                  value={feedSearch}
                  onChange={(event) => setFeedSearch(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </label>

              {isOperationsManager ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "工程师 / 提交人" : "Engineer / author"}
                    </span>
                    <select
                      value={authorFilter}
                      onChange={(event) => setAuthorFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    >
                      <option value="">{language === "zh" ? "全部" : "All"}</option>
                      {reportAuthors.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "项目" : "Project"}
                    </span>
                    <select
                      value={projectFilter}
                      onChange={(event) => setProjectFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    >
                      <option value="">{language === "zh" ? "全部" : "All"}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "站点" : "Site"}
                    </span>
                    <select
                      value={siteFilter}
                      onChange={(event) => setSiteFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    >
                      <option value="">{language === "zh" ? "全部" : "All"}</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "开始日期" : "Date from"}
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "结束日期" : "Date to"}
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            {filteredReports.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {language === "zh" ? "没有匹配的日报记录。" : "No report matches the current filters."}
              </div>
            ) : (
              filteredReports.map((report) => {
                const taskItems = renderItemList(report.majorTaskItems);
                const blockerItems = renderItemList(report.blockerItems);
                const nextDayItems = renderItemList(report.nextDayPlanItems);
                const authorName =
                  profiles.find((profile) => profile.id === report.authorUserId)?.fullName ??
                  report.authorUserId;
                const siteName =
                  sites.find(
                    (site) =>
                      site.id === projects.find((project) => project.id === report.projectId)?.siteId,
                  )?.name ?? "--";

                return (
                  <div
                    key={report.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {projects.find((project) => project.id === report.projectId)?.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatDisplayDate(report.date, language)} · {siteName} · {authorName}
                        </p>
                      </div>
                      <Badge tone={report.status === "submitted" ? "accent" : "success"}>
                        {report.status}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div>
                        <p className="font-medium text-slate-900">{copy.report.majorTasks}</p>
                        <ul className="mt-2 space-y-1">
                          {taskItems.map((item, index) => (
                            <li key={`${report.id}-task-${index}`}>
                              {`${index + 1}. ${item.text}`}
                              {item.attachments.length > 0 ? (
                                <span className="ml-2 text-xs text-slate-500">
                                  {language === "zh"
                                    ? `(${item.attachments.length} 张图)`
                                    : `(${item.attachments.length} photo${item.attachments.length > 1 ? "s" : ""})`}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {blockerItems.length > 0 ? (
                        <div>
                          <p className="font-medium text-slate-900">{copy.report.blockers}</p>
                          <ul className="mt-2 space-y-1">
                            {blockerItems.map((item, index) => (
                              <li key={`${report.id}-blocker-${index}`}>
                                {`${index + 1}. ${item.text}`}
                                {item.attachments.length > 0 ? (
                                  <span className="ml-2 text-xs text-slate-500">
                                    {language === "zh"
                                      ? `(${item.attachments.length} 张图)`
                                      : `(${item.attachments.length} photo${item.attachments.length > 1 ? "s" : ""})`}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div>
                        <p className="font-medium text-slate-900">{copy.report.nextDayPlan}</p>
                        <ul className="mt-2 space-y-1">
                          {nextDayItems.map((item, index) => (
                            <li key={`${report.id}-next-${index}`}>
                              {`${index + 1}. ${item.text}`}
                              {item.attachments.length > 0 ? (
                                <span className="ml-2 text-xs text-slate-500">
                                  {language === "zh"
                                    ? `(${item.attachments.length} 张图)`
                                    : `(${item.attachments.length} photo${item.attachments.length > 1 ? "s" : ""})`}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {report.attachments.length > 0 ? (
                        <p className="text-xs font-medium text-slate-500">
                          {language === "zh"
                            ? `已附 ${report.attachments.length} 张照片`
                            : `${report.attachments.length} photo(s) attached`}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isOperationsManager ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(report.id)}
                          className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600"
                        >
                          {copy.common.delete}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleExport(report.id)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        {language === "zh" ? "导出 PDF" : "Export PDF"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
