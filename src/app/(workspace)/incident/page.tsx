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
import {
  createDraftMediaItemsFromStoredItems,
  createDraftMediaListItem,
} from "@/lib/media-items";
import { exportIncidentPdf } from "@/lib/pdf-export";
import type { MediaListItem } from "@/lib/types";
import { formatDisplayDateTime } from "@/lib/utils";

function getIncidentLabel(status: string, language: "en" | "zh") {
  const labels = {
    open: { en: "Open", zh: "打开" },
    under_review: { en: "Under review", zh: "审核中" },
    closed: { en: "Closed", zh: "已关闭" },
  } as const;

  return labels[status as keyof typeof labels]?.[language] ?? status;
}

function getNowLocalDateTimeValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function IncidentPage() {
  const {
    copy,
    currentUser,
    deleteIncident,
    incidents,
    isOperationsManager,
    language,
    profiles,
    projects,
    sites,
    submitIncident,
    toggleIncidentStatus,
    updateIncident,
  } = useAppState();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [occurredAt, setOccurredAt] = useState(getNowLocalDateTimeValue());
  const [incidentType, setIncidentType] = useState("Near miss");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [facts, setFacts] = useState([createDraftMediaListItem()]);
  const [immediateActions, setImmediateActions] = useState([createDraftMediaListItem()]);
  const [followUps, setFollowUps] = useState([createDraftMediaListItem()]);
  const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);
  const [escalationRequired, setEscalationRequired] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [feedSearch, setFeedSearch] = useState("");
  const [reporterFilter, setReporterFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
          existingPhotosLabelTemplate: "保存时会保留这 {count} 张已有照片。",
        }
      : {
          pickPhotoLabel: "Add photo",
          cameraLabel: "Camera",
          pastePhotoLabel: "Paste image",
          cameraReadyLabel: "Camera is live. Frame the shot and capture it.",
          capturePhotoLabel: "Capture",
          closeCameraLabel: "Close camera",
          cameraUnavailableLabel: "Could not open the camera. Check permission or use Add photo.",
          existingPhotosLabelTemplate:
            "{count} existing photo(s) will be kept when you save.",
        };

  const visibleIncidents = useMemo(
    () =>
      isOperationsManager
        ? incidents
        : incidents.filter((incident) => incident.reporterUserId === currentUser?.id),
    [currentUser?.id, incidents, isOperationsManager],
  );

  const filteredIncidents = useMemo(() => {
    const normalizedSearch = feedSearch.trim().toLowerCase();

    return visibleIncidents.filter((incident) => {
      const project = projects.find((item) => item.id === incident.projectId);
      const site = sites.find((item) => item.id === project?.siteId);
      const reporter = profiles.find((item) => item.id === incident.reporterUserId);
      const incidentDate = incident.occurredAt.slice(0, 10);
      const allText = [
        String(incident.recordNumber),
        incident.incidentType,
        incident.severity,
        incident.description,
        incident.immediateAction,
        incident.correctiveAction,
        ...incident.factItems.map((item) => item.text),
        ...incident.immediateActionItems.map((item) => item.text),
        ...incident.followUpItems.map((item) => item.text),
        project?.name ?? "",
        site?.name ?? "",
        reporter?.fullName ?? "",
        incidentDate,
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !allText.includes(normalizedSearch)) {
        return false;
      }

      if (isOperationsManager) {
        if (reporterFilter && incident.reporterUserId !== reporterFilter) {
          return false;
        }

        if (projectFilter && incident.projectId !== projectFilter) {
          return false;
        }

        if (siteFilter && project?.siteId !== siteFilter) {
          return false;
        }

        if (severityFilter && incident.severity !== severityFilter) {
          return false;
        }

        if (statusFilter && incident.status !== statusFilter) {
          return false;
        }

        if (dateFrom && incidentDate < dateFrom) {
          return false;
        }

        if (dateTo && incidentDate > dateTo) {
          return false;
        }
      }

      return true;
    });
  }, [
    dateFrom,
    dateTo,
    feedSearch,
    isOperationsManager,
    profiles,
    projectFilter,
    projects,
    reporterFilter,
    severityFilter,
    siteFilter,
    sites,
    statusFilter,
    visibleIncidents,
  ]);

  const incidentReporters = useMemo(() => {
    const ids = Array.from(new Set(incidents.map((incident) => incident.reporterUserId)));

    return profiles
      .filter((profile) => ids.includes(profile.id))
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }, [incidents, profiles]);

  function resetForm() {
    setEditingIncidentId(null);
    setProjectId(projects[0]?.id ?? "");
    setOccurredAt(getNowLocalDateTimeValue());
    setIncidentType("Near miss");
    setSeverity("medium");
    setFacts([createDraftMediaListItem()]);
    setImmediateActions([createDraftMediaListItem()]);
    setFollowUps([createDraftMediaListItem()]);
    setEscalationRequired(true);
  }

  async function handleSubmit() {
    const payload = {
      projectId,
      occurredAt: new Date(occurredAt).toISOString(),
      incidentType,
      severity,
      facts,
      immediateActions,
      followUps,
      escalationRequired,
    } as const;

    const result = editingIncidentId
      ? await updateIncident({
          id: editingIncidentId,
          ...payload,
        })
      : await submitIncident(payload);

    if (!result.ok) {
      setFeedback(result.error ?? "");
      return;
    }

    setFeedback(
      editingIncidentId
        ? language === "zh"
          ? "异常记录已更新。"
          : "Incident updated."
        : copy.incident.submitSuccess,
    );
    resetForm();
  }

  function startEditing(incidentId: string) {
    const incident = incidents.find((item) => item.id === incidentId);

    if (!incident) {
      return;
    }

    setEditingIncidentId(incident.id);
    setProjectId(incident.projectId);
    setOccurredAt(toDateTimeLocalValue(incident.occurredAt));
    setIncidentType(incident.incidentType);
    setSeverity(incident.severity);
    setFacts(createDraftMediaItemsFromStoredItems(incident.factItems));
    setImmediateActions(createDraftMediaItemsFromStoredItems(incident.immediateActionItems));
    setFollowUps(createDraftMediaItemsFromStoredItems(incident.followUpItems));
    setEscalationRequired(incident.escalationRequired);
    setFeedback(
      language === "zh"
        ? `正在编辑异常 #${incident.recordNumber}`
        : `Editing incident #${incident.recordNumber}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderItemList(items: MediaListItem[]) {
    return items.filter((item) => item.text.trim().length > 0 || item.attachments.length > 0);
  }

  async function handleToggleStatus(incidentId: string) {
    const result = await toggleIncidentStatus(incidentId);
    setFeedback(
      result.ok
        ? language === "zh"
          ? "异常状态已更新。"
          : "Incident status updated."
        : result.error ?? "",
    );
  }

  async function handleExport(incidentId: string) {
    const incident = incidents.find((item) => item.id === incidentId);

    if (!incident) {
      return;
    }

    const projectName =
      projects.find((project) => project.id === incident.projectId)?.name ?? incident.projectId;
    const reporterName =
      profiles.find((profile) => profile.id === incident.reporterUserId)?.fullName ??
      incident.reporterUserId;

    await exportIncidentPdf({
      incident,
      projectName,
      reporterName,
      language,
    });
  }

  async function handleDelete(incidentId: string) {
    const confirmed = window.confirm(
      language === "zh"
        ? "确认删除这条异常记录？此操作无法撤销。"
        : "Delete this incident? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteIncident(incidentId);
    setFeedback(
      result.ok
        ? language === "zh"
          ? "异常记录已删除。"
          : "Incident deleted."
        : result.error ?? "",
    );
  }

  return (
    <div className="space-y-6 py-2">
      <PageHeader
        eyebrow={copy.nav.incident}
        title={copy.incident.title}
        description={copy.incident.description}
        badges={[
          {
            label: editingIncidentId
              ? language === "zh"
                ? "编辑异常"
                : "Edit incident"
              : copy.incident.newRecord,
            tone: "brand",
          },
          { label: copy.incident.incidentFeed, tone: "danger" },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="bg-slate-950 text-white">
          <CardHeader>
            <CardEyebrow className="text-white/50">
              {editingIncidentId
                ? language === "zh"
                  ? "编辑异常"
                  : "Edit incident"
                : copy.incident.newRecord}
            </CardEyebrow>
            <CardTitle className="text-white">
              {projects.find((project) => project.id === projectId)?.name ??
                (language === "zh" ? "选择项目" : "Choose a project")}
            </CardTitle>
            <CardDescription className="text-white/70">
              {language === "zh"
                ? "按事实、即时动作和后续跟进拆成编号列表，现场填写会更快。"
                : "Break the report into facts, immediate actions, and follow-up items so it can be filed quickly on site."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {language === "zh" ? "发生时间" : "Occurred at"}
                </span>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">{copy.incident.incidentType}</span>
                <select
                  value={incidentType}
                  onChange={(event) => setIncidentType(event.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
                >
                  <option className="text-slate-950">Near miss</option>
                  <option className="text-slate-950">Incident</option>
                  <option className="text-slate-950">Unsafe act</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">{copy.incident.severity}</span>
                <select
                  value={severity}
                  onChange={(event) =>
                    setSeverity(event.target.value as "low" | "medium" | "high")
                  }
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="low" className="text-slate-950">
                    low
                  </option>
                  <option value="medium" className="text-slate-950">
                    medium
                  </option>
                  <option value="high" className="text-slate-950">
                    high
                  </option>
                </select>
              </label>
            </div>

            <NumberedListComposer
              dark
              label={language === "zh" ? "发生了什么" : "What happened"}
              helper={
                language === "zh"
                  ? "按时间顺序列关键事实。"
                  : "Capture the key facts in order."
              }
              items={facts}
              onChange={setFacts}
              placeholder={
                language === "zh"
                  ? "例如：08:42 在充电区发现电缆护套破损"
                  : "For example: 08:42 found a damaged cable jacket in the charging area"
              }
              addLabel={language === "zh" ? "添加" : "Add"}
              emptyLabel={language === "zh" ? "还没有事实记录。" : "No incident facts yet."}
              pickPhotoLabel={mediaCopy.pickPhotoLabel}
              cameraLabel={mediaCopy.cameraLabel}
              pastePhotoLabel={mediaCopy.pastePhotoLabel}
              cameraReadyLabel={mediaCopy.cameraReadyLabel}
              capturePhotoLabel={mediaCopy.capturePhotoLabel}
              closeCameraLabel={mediaCopy.closeCameraLabel}
              cameraUnavailableLabel={mediaCopy.cameraUnavailableLabel}
              existingPhotosLabelTemplate={mediaCopy.existingPhotosLabelTemplate}
            />

            <NumberedListComposer
              dark
              label={copy.incident.immediateAction}
              helper={
                language === "zh"
                  ? "写现场马上做了哪些动作。"
                  : "List the actions taken immediately on site."
              }
              items={immediateActions}
              onChange={setImmediateActions}
              placeholder={
                language === "zh"
                  ? "例如：暂停该区域作业并通知现场主管"
                  : "For example: Stopped work in the area and notified the site lead"
              }
              addLabel={language === "zh" ? "添加" : "Add"}
              emptyLabel={
                language === "zh"
                  ? "还没有即时动作。"
                  : "No immediate action items yet."
              }
              pickPhotoLabel={mediaCopy.pickPhotoLabel}
              cameraLabel={mediaCopy.cameraLabel}
              pastePhotoLabel={mediaCopy.pastePhotoLabel}
              cameraReadyLabel={mediaCopy.cameraReadyLabel}
              capturePhotoLabel={mediaCopy.capturePhotoLabel}
              closeCameraLabel={mediaCopy.closeCameraLabel}
              cameraUnavailableLabel={mediaCopy.cameraUnavailableLabel}
              existingPhotosLabelTemplate={mediaCopy.existingPhotosLabelTemplate}
            />

            <NumberedListComposer
              dark
              label={language === "zh" ? "后续跟进" : "Follow-up / closeout"}
              helper={
                language === "zh"
                  ? "写需要继续跟进、整改或关闭的事项。"
                  : "List the follow-up, correction, or closure items."
              }
              items={followUps}
              onChange={setFollowUps}
              placeholder={
                language === "zh"
                  ? "例如：安排更换损坏线缆并复检"
                  : "For example: Replace the damaged cable and re-inspect the area"
              }
              addLabel={language === "zh" ? "添加" : "Add"}
              emptyLabel={language === "zh" ? "还没有后续事项。" : "No follow-up items yet."}
              pickPhotoLabel={mediaCopy.pickPhotoLabel}
              cameraLabel={mediaCopy.cameraLabel}
              pastePhotoLabel={mediaCopy.pastePhotoLabel}
              cameraReadyLabel={mediaCopy.cameraReadyLabel}
              capturePhotoLabel={mediaCopy.capturePhotoLabel}
              closeCameraLabel={mediaCopy.closeCameraLabel}
              cameraUnavailableLabel={mediaCopy.cameraUnavailableLabel}
              existingPhotosLabelTemplate={mediaCopy.existingPhotosLabelTemplate}
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={escalationRequired}
                onChange={(event) => setEscalationRequired(event.target.checked)}
                className="h-4 w-4 rounded border-white/20"
              />
              <span>{copy.incident.escalation}</span>
            </label>

            {feedback ? (
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white/80">
                {feedback}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
              >
                {editingIncidentId ? copy.common.save : copy.common.submit}
              </button>
              {editingIncidentId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white"
                >
                  {copy.common.cancel}
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardEyebrow>{copy.incident.incidentFeed}</CardEyebrow>
            <CardTitle>{copy.incident.incidentFeed}</CardTitle>
            <CardDescription>
              {isOperationsManager
                ? language === "zh"
                  ? "可查看全量异常，并按工程师、项目、站点、日期、状态和严重级别筛选。"
                  : "Review all incidents and filter by engineer, project, site, date, status, and severity."
                : language === "zh"
                  ? "这里只显示你自己的异常记录。"
                  : "Only your own incidents are shown here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {language === "zh" ? "搜索编号 / 内容 / 项目 / 站点" : "Search ID / content / project / site"}
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
                      {language === "zh" ? "工程师 / 提交人" : "Engineer / reporter"}
                    </span>
                    <select
                      value={reporterFilter}
                      onChange={(event) => setReporterFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    >
                      <option value="">{language === "zh" ? "全部" : "All"}</option>
                      {incidentReporters.map((profile) => (
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
                      {language === "zh" ? "严重级别" : "Severity"}
                    </span>
                    <select
                      value={severityFilter}
                      onChange={(event) => setSeverityFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    >
                      <option value="">{language === "zh" ? "全部" : "All"}</option>
                      <option value="low">{language === "zh" ? "低" : "Low"}</option>
                      <option value="medium">{language === "zh" ? "中" : "Medium"}</option>
                      <option value="high">{language === "zh" ? "高" : "High"}</option>
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "zh" ? "状态" : "Status"}
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                    >
                      <option value="">{language === "zh" ? "全部" : "All"}</option>
                      <option value="open">{getIncidentLabel("open", language)}</option>
                      <option value="under_review">{getIncidentLabel("under_review", language)}</option>
                      <option value="closed">{getIncidentLabel("closed", language)}</option>
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

            {filteredIncidents.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {language === "zh" ? "没有匹配的异常记录。" : "No incident matches the current filters."}
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const factItems = renderItemList(incident.factItems);
                const immediateItems = renderItemList(incident.immediateActionItems);
                const followUpItems = renderItemList(incident.followUpItems);
                const reporterName =
                  profiles.find((profile) => profile.id === incident.reporterUserId)?.fullName ??
                  incident.reporterUserId;
                const siteName =
                  sites.find(
                    (site) =>
                      site.id === projects.find((project) => project.id === incident.projectId)?.siteId,
                  )?.name ?? "--";
                const canEdit =
                  isOperationsManager || incident.reporterUserId === currentUser?.id;

                return (
                  <div
                    key={incident.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {projects.find((project) => project.id === incident.projectId)?.name}
                          </p>
                          <Badge tone="signal">#{incident.recordNumber}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {formatDisplayDateTime(incident.occurredAt, language)} · {siteName} ·{" "}
                          {reporterName}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          tone={
                            incident.severity === "high"
                              ? "danger"
                              : incident.severity === "medium"
                                ? "accent"
                                : "signal"
                          }
                        >
                          {incident.severity}
                        </Badge>
                        <Badge tone={incident.status === "closed" ? "success" : "danger"}>
                          {getIncidentLabel(incident.status, language)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div>
                        <p className="font-medium text-slate-900">
                          {language === "zh" ? "发生了什么" : "What happened"}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {factItems.map((item, index) => (
                            <li key={`${incident.id}-fact-${index}`}>
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

                      {immediateItems.length > 0 ? (
                        <div>
                          <p className="font-medium text-slate-900">
                            {copy.incident.immediateAction}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {immediateItems.map((item, index) => (
                              <li key={`${incident.id}-immediate-${index}`}>
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

                      {followUpItems.length > 0 ? (
                        <div>
                          <p className="font-medium text-slate-900">
                            {language === "zh" ? "后续跟进" : "Follow-up / closeout"}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {followUpItems.map((item, index) => (
                              <li key={`${incident.id}-follow-${index}`}>
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
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => startEditing(incident.id)}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          {copy.common.edit}
                        </button>
                      ) : null}
                      {isOperationsManager ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleDelete(incident.id)}
                            className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600"
                          >
                            {copy.common.delete}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(incident.id)}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            {incident.status === "closed"
                              ? copy.incident.reopen
                              : copy.incident.close}
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleExport(incident.id)}
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
