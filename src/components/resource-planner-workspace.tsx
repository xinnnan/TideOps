"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useAppState } from "@/components/providers/app-provider";
import { MetricCard } from "@/components/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardEyebrow,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResourceAllocation, ResourcePerson } from "@/lib/types";
import { cn, formatDisplayDate } from "@/lib/utils";

interface SelectOption {
  label: string;
  value: string;
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition",
          disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "focus:border-brand",
        )}
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-brand"
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-brand"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}

function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getWeekStartInputValue(date = new Date()) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return formatIsoDate(monday);
}

function addDaysToIsoDate(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function buildPlanningDates(startDate: string, dayCount: number) {
  return Array.from({ length: dayCount }, (_, index) => addDaysToIsoDate(startDate, index));
}

function isWeekdayDate(dateValue: string) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  return day !== 0 && day !== 6;
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function dateRangesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function getProjectTimelineColor(projectId: string, projects: Array<{ id: string }>) {
  const index = Math.max(
    0,
    projects.findIndex((project) => project.id === projectId),
  );
  const palette = [
    { background: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
    { background: "#dcfce7", border: "#86efac", text: "#047857" },
    { background: "#fef3c7", border: "#fcd34d", text: "#92400e" },
    { background: "#fce7f3", border: "#f9a8d4", text: "#be185d" },
    { background: "#ede9fe", border: "#c4b5fd", text: "#6d28d9" },
    { background: "#e0f2fe", border: "#7dd3fc", text: "#0369a1" },
  ];

  return palette[index % palette.length];
}

function getProjectContext(
  projectId: string,
  projects: Array<{ id: string; name: string; clientId: string; siteId: string }>,
  clients: Array<{ id: string; name: string }>,
  sites: Array<{ id: string; name: string }>,
) {
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return {
      projectName: projectId,
      siteName: "--",
      clientName: "--",
      optionLabel: projectId,
    };
  }

  const siteName = sites.find((site) => site.id === project.siteId)?.name ?? "--";
  const clientName = clients.find((client) => client.id === project.clientId)?.name ?? "--";

  return {
    projectName: project.name,
    siteName,
    clientName,
    optionLabel: `${clientName} / ${siteName} / ${project.name}`,
  };
}

function getUtilizationClass(utilization: number) {
  if (utilization > 100) {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  if (utilization >= 85) {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  if (utilization > 0) {
    return "bg-blue-100 text-blue-700 ring-blue-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function ResourceProfileEditor({
  resource,
  companies,
  language,
  updateResourcePerson,
  onNotify,
}: {
  resource: ResourcePerson | null;
  companies: Array<{ id: string; name: string }>;
  language: "en" | "zh";
  updateResourcePerson: (payload: {
    id: string;
    displayName: string;
    title: string;
    homeCompanyId: string;
    skills: string;
    capacityHoursPerDay: string;
    active: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
}) {
  const [displayName, setDisplayName] = useState(resource?.displayName ?? "");
  const [title, setTitle] = useState(resource?.title ?? "");
  const [homeCompanyId, setHomeCompanyId] = useState(resource?.homeCompanyId ?? "");
  const [skills, setSkills] = useState(resource?.skills.join(", ") ?? "");
  const [capacityHours, setCapacityHours] = useState(
    String(resource?.capacityHoursPerDay || 8),
  );
  const [active, setActive] = useState(resource?.active ?? true);

  async function handleUpdateResource() {
    if (!resource) {
      return;
    }

    const result = await updateResourcePerson({
      id: resource.id,
      displayName,
      title,
      homeCompanyId,
      skills,
      capacityHoursPerDay: capacityHours,
      active,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "资源资料已更新。"
          : "Resource updated."
        : result.error ?? "",
    );
  }

  if (!resource) {
    return (
      <EmptyState message={language === "zh" ? "请选择一个资源。" : "Select a resource first."} />
    );
  }

  return (
    <>
      <LabeledInput
        label={language === "zh" ? "名称" : "Name"}
        value={displayName}
        onChange={setDisplayName}
        disabled={resource.resourceType === "platform_user"}
      />
      <LabeledInput
        label={language === "zh" ? "职能" : "Title"}
        value={title}
        onChange={setTitle}
        disabled={resource.resourceType === "platform_user"}
      />
      <LabeledSelect
        label={language === "zh" ? "归属公司" : "Home company"}
        value={homeCompanyId}
        onChange={setHomeCompanyId}
        options={[
          { value: "", label: language === "zh" ? "未指定" : "Not set" },
          ...companies.map((company) => ({
            label: company.name,
            value: company.id,
          })),
        ]}
      />
      <LabeledInput
        label={language === "zh" ? "每日容量小时" : "Capacity hours / day"}
        type="number"
        value={capacityHours}
        onChange={setCapacityHours}
      />
      <LabeledTextarea
        label={language === "zh" ? "技能标签" : "Skills"}
        value={skills}
        onChange={setSkills}
        rows={2}
      />
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        {language === "zh" ? "资源可排班" : "Resource is schedulable"}
      </label>
      <button
        type="button"
        onClick={handleUpdateResource}
        className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {language === "zh" ? "保存资源" : "Save resource"}
      </button>
    </>
  );
}

export function ResourcePlannerWorkspace({
  onNotify,
}: {
  onNotify: (message: string) => void;
}) {
  const {
    clients,
    companies,
    createResourceAllocation,
    createResourcePerson,
    deleteResourceAllocation,
    language,
    leaveRequests,
    profiles,
    projects,
    resourceAllocations,
    resourcePeople,
    sites,
    updateResourceAllocation,
    updateResourcePerson,
  } = useAppState();
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(getWeekStartInputValue());
  const [projectFilterId, setProjectFilterId] = useState("");
  const [resourceQuery, setResourceQuery] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [placeholderName, setPlaceholderName] = useState("");
  const [placeholderTitle, setPlaceholderTitle] = useState("");
  const [placeholderCompanyId, setPlaceholderCompanyId] = useState("");
  const [placeholderSkills, setPlaceholderSkills] = useState("");
  const [placeholderCapacity, setPlaceholderCapacity] = useState("8");
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState("");
  const [allocationResourceId, setAllocationResourceId] = useState("");
  const [allocationProjectId, setAllocationProjectId] = useState("");
  const [allocationStartDate, setAllocationStartDate] = useState(weekStart);
  const [allocationEndDate, setAllocationEndDate] = useState(weekStart);
  const [allocationHours, setAllocationHours] = useState("8");
  const [allocationPercent, setAllocationPercent] = useState("100");
  const [allocationRole, setAllocationRole] = useState("");
  const [allocationStatus, setAllocationStatus] =
    useState<ResourceAllocation["status"]>("tentative");
  const [allocationNotes, setAllocationNotes] = useState("");
  const visibleDates = useMemo(
    () => buildPlanningDates(weekStart, viewMode === "week" ? 7 : 28),
    [viewMode, weekStart],
  );
  const visibleStart = visibleDates[0] ?? weekStart;
  const visibleEnd = visibleDates[visibleDates.length - 1] ?? weekStart;
  const projectOptions = projects.map((project) => ({
    label: getProjectContext(project.id, projects, clients, sites).optionLabel,
    value: project.id,
  }));
  const selectedResource =
    resourcePeople.find((resource) => resource.id === selectedResourceId) ??
    resourcePeople[0] ??
    null;
  const effectiveAllocationResourceId =
    allocationResourceId || selectedResource?.id || resourcePeople[0]?.id || "";
  const effectiveAllocationProjectId = allocationProjectId || projectFilterId || projects[0]?.id || "";
  const allocationResource = resourcePeople.find(
    (resource) => resource.id === effectiveAllocationResourceId,
  );
  const allocationProject = projects.find((project) => project.id === effectiveAllocationProjectId);
  const allocationProjectContext = allocationProject
    ? getProjectContext(allocationProject.id, projects, clients, sites)
    : null;
  const canSaveAllocation = Boolean(
    effectiveAllocationResourceId &&
      effectiveAllocationProjectId &&
      allocationStartDate &&
      allocationEndDate,
  );
  const normalizedQuery = resourceQuery.trim().toLowerCase();
  const visibleAllocations = useMemo(
    () =>
      resourceAllocations
        .filter((allocation) =>
          dateRangesOverlap(allocation.startDate, allocation.endDate, visibleStart, visibleEnd),
        )
        .filter((allocation) =>
          projectFilterId ? allocation.projectId === projectFilterId : true,
        ),
    [projectFilterId, resourceAllocations, visibleEnd, visibleStart],
  );
  const visibleResources = useMemo(
    () =>
      resourcePeople
        .filter((resource) => {
          const profile = profiles.find((item) => item.id === resource.linkedUserId);
          const company = companies.find((item) => item.id === resource.homeCompanyId);
          const haystack = [
            resource.displayName,
            resource.title ?? "",
            profile?.email ?? "",
            company?.name ?? "",
            ...resource.skills,
          ]
            .join(" ")
            .toLowerCase();
          const matchesSearch = normalizedQuery ? haystack.includes(normalizedQuery) : true;
          const matchesProject = projectFilterId
            ? visibleAllocations.some(
                (allocation) =>
                  allocation.resourceId === resource.id && allocation.projectId === projectFilterId,
              )
            : true;

          return matchesSearch && matchesProject;
        })
        .sort(
          (left, right) =>
            Number(right.active) - Number(left.active) ||
            left.displayName.localeCompare(right.displayName),
        ),
    [companies, normalizedQuery, profiles, projectFilterId, resourcePeople, visibleAllocations],
  );
  const placeholderCount = resourcePeople.filter(
    (resource) => resource.resourceType === "placeholder",
  ).length;
  const totalPlannedHours = visibleDates.reduce(
    (total, date) =>
      total +
      visibleAllocations
        .filter((allocation) => isDateInRange(date, allocation.startDate, allocation.endDate))
        .reduce((dayTotal, allocation) => dayTotal + allocation.plannedHoursPerDay, 0),
    0,
  );
  const overbookedCellCount = visibleResources.reduce(
    (total, resource) =>
      total +
      visibleDates.filter((date) => {
        const dailyHours = visibleAllocations
          .filter(
            (allocation) =>
              allocation.resourceId === resource.id &&
              isDateInRange(date, allocation.startDate, allocation.endDate),
          )
          .reduce((dayTotal, allocation) => dayTotal + allocation.plannedHoursPerDay, 0);

        return resource.capacityHoursPerDay > 0 && dailyHours > resource.capacityHoursPerDay;
      }).length,
    0,
  );

  function getResourceDayData(resource: ResourcePerson, date: string) {
    const allocations = visibleAllocations.filter(
      (allocation) =>
        allocation.resourceId === resource.id &&
        isDateInRange(date, allocation.startDate, allocation.endDate),
    );
    const plannedHours = allocations.reduce(
      (total, allocation) => total + allocation.plannedHoursPerDay,
      0,
    );
    const utilization =
      resource.capacityHoursPerDay > 0
        ? Math.round((plannedHours / resource.capacityHoursPerDay) * 100)
        : 0;
    const leave = resource.linkedUserId
      ? leaveRequests.find(
          (request) =>
            request.requesterUserId === resource.linkedUserId &&
            request.status === "approved" &&
            isDateInRange(date, request.startDate, request.endDate),
        )
      : null;

    return { allocations, leave, plannedHours, utilization };
  }

  function getResourceSummary(resource: ResourcePerson) {
    const dailyUtilization = visibleDates.map((date) => getResourceDayData(resource, date));
    const maxUtilization = Math.max(0, ...dailyUtilization.map((day) => day.utilization));
    const plannedHours = dailyUtilization.reduce((total, day) => total + day.plannedHours, 0);

    return { maxUtilization, plannedHours };
  }

  function resetAllocationForm() {
    setEditingAllocationId("");
    setAllocationResourceId(selectedResource?.id ?? resourcePeople[0]?.id ?? "");
    setAllocationProjectId(projectFilterId || projects[0]?.id || "");
    setAllocationStartDate(weekStart);
    setAllocationEndDate(weekStart);
    setAllocationHours("8");
    setAllocationPercent("100");
    setAllocationRole("");
    setAllocationStatus("tentative");
    setAllocationNotes("");
  }

  function closeAllocationModal() {
    setIsAllocationModalOpen(false);
    resetAllocationForm();
  }

  function openBlankAllocationModal() {
    resetAllocationForm();
    setIsAllocationModalOpen(true);
  }

  function beginAllocationForCell(resource: ResourcePerson, date: string) {
    setEditingAllocationId("");
    setSelectedResourceId(resource.id);
    setAllocationResourceId(resource.id);
    setAllocationProjectId(projectFilterId || projects[0]?.id || "");
    setAllocationStartDate(date);
    setAllocationEndDate(date);
    setAllocationHours(String(resource.capacityHoursPerDay || 8));
    setAllocationPercent("100");
    setAllocationRole(resource.title ?? "");
    setAllocationStatus("tentative");
    setAllocationNotes("");
    setIsAllocationModalOpen(true);
  }

  function handleCellKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    resource: ResourcePerson,
    date: string,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      beginAllocationForCell(resource, date);
    }
  }

  function loadAllocationForEdit(allocation: ResourceAllocation) {
    setEditingAllocationId(allocation.id);
    setAllocationResourceId(allocation.resourceId);
    setAllocationProjectId(allocation.projectId);
    setAllocationStartDate(allocation.startDate);
    setAllocationEndDate(allocation.endDate);
    setAllocationHours(String(allocation.plannedHoursPerDay));
    setAllocationPercent(String(allocation.allocationPercent));
    setAllocationRole(allocation.roleLabel ?? "");
    setAllocationStatus(allocation.status);
    setAllocationNotes(allocation.notes ?? "");
    setSelectedResourceId(allocation.resourceId);
    setIsAllocationModalOpen(true);
  }

  async function handleCreatePlaceholder() {
    const result = await createResourcePerson({
      displayName: placeholderName,
      title: placeholderTitle,
      homeCompanyId: placeholderCompanyId,
      skills: placeholderSkills,
      capacityHoursPerDay: placeholderCapacity,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "占位技术人员已添加。"
          : "Placeholder technician added."
        : result.error ?? "",
    );

    if (result.ok) {
      setPlaceholderName("");
      setPlaceholderTitle("");
      setPlaceholderCompanyId("");
      setPlaceholderSkills("");
      setPlaceholderCapacity("8");
    }
  }

  async function handleSaveAllocation() {
    if (!canSaveAllocation) {
      onNotify(
        language === "zh"
          ? "请选择资源、项目和日期后再保存。"
          : "Choose a resource, project, and dates before saving.",
      );
      return;
    }

    const payload = {
      resourceId: effectiveAllocationResourceId,
      projectId: effectiveAllocationProjectId,
      startDate: allocationStartDate,
      endDate: allocationEndDate,
      plannedHoursPerDay: allocationHours,
      allocationPercent,
      roleLabel: allocationRole,
      status: allocationStatus,
      notes: allocationNotes,
    };
    const result = editingAllocationId
      ? await updateResourceAllocation({ id: editingAllocationId, ...payload })
      : await createResourceAllocation(payload);

    onNotify(
      result.ok
        ? editingAllocationId
          ? language === "zh"
            ? "资源安排已更新。"
            : "Resource allocation updated."
          : language === "zh"
            ? "资源安排已创建。"
            : "Resource allocation created."
        : result.error ?? "",
    );

    if (result.ok) {
      setIsAllocationModalOpen(false);
      resetAllocationForm();
    }
  }

  async function handleDeleteAllocation() {
    if (!editingAllocationId) {
      return;
    }

    const confirmed = window.confirm(
      language === "zh" ? "确认删除这条资源安排？" : "Delete this resource allocation?",
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteResourceAllocation(editingAllocationId);
    onNotify(
      result.ok
        ? language === "zh"
          ? "资源安排已删除。"
          : "Resource allocation deleted."
        : result.error ?? "",
    );

    if (result.ok) {
      setIsAllocationModalOpen(false);
      resetAllocationForm();
    }
  }

  function shiftVisibleRange(direction: -1 | 1) {
    const amount = viewMode === "week" ? 7 : 28;
    setWeekStart(addDaysToIsoDate(weekStart, amount * direction));
  }

  const timelineGridTemplateColumns =
    viewMode === "week"
      ? "240px repeat(7, minmax(0, 1fr))"
      : `250px repeat(${visibleDates.length}, minmax(142px, 1fr))`;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={language === "zh" ? "资源" : "Resources"}
          value={String(resourcePeople.length)}
          detail={language === "zh" ? "可排班人员与占位资源。" : "People and placeholders available to schedule."}
          tone="brand"
        />
        <MetricCard
          label={language === "zh" ? "占位技术人员" : "Placeholders"}
          value={String(placeholderCount)}
          detail={language === "zh" ? "未绑定登录账号的计划资源。" : "Planning resources without login accounts."}
          tone="signal"
        />
        <MetricCard
          label={language === "zh" ? "计划小时" : "Planned hours"}
          value={String(totalPlannedHours)}
          detail={language === "zh" ? "当前视图内的计划工时。" : "Scheduled hours in the current view."}
          tone="accent"
        />
        <MetricCard
          label={language === "zh" ? "超负荷天数" : "Overbooked days"}
          value={String(overbookedCellCount)}
          detail={language === "zh" ? "超过每日容量的资源日期。" : "Resource-days above daily capacity."}
          tone={overbookedCellCount > 0 ? "danger" : "brand"}
        />
      </section>

      <section className="space-y-4">
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardEyebrow>{language === "zh" ? "资源资料" : "Resource profile"}</CardEyebrow>
              <CardTitle>{language === "zh" ? "当前资源" : "Selected resource"}</CardTitle>
              <CardDescription>
                {language === "zh"
                  ? "平台用户会自动进入资源池，占位技术人员可在下方添加。"
                  : "Platform users are added automatically; placeholder technicians can be added below."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ResourceProfileEditor
                key={selectedResource?.id ?? "empty-resource"}
                resource={selectedResource}
                companies={companies}
                language={language}
                updateResourcePerson={updateResourcePerson}
                onNotify={onNotify}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardEyebrow>{language === "zh" ? "资源日历" : "Resource calendar"}</CardEyebrow>
            <CardTitle>{language === "zh" ? "排班与使用率" : "Schedule and utilization"}</CardTitle>
            <CardDescription>
              {language === "zh"
                ? "按人员查看项目安排、计划工时、请假冲突和超负荷日期。"
                : "Review project allocations, planned hours, leave conflicts, and overbooked days by resource."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[0.8fr_1fr_1fr_1fr]">
              <LabeledSelect
                label={language === "zh" ? "视图" : "View"}
                value={viewMode}
                onChange={(value) => setViewMode(value as "week" | "month")}
                options={[
                  { value: "week", label: language === "zh" ? "周视图" : "Week" },
                  { value: "month", label: language === "zh" ? "4周视图" : "4 weeks" },
                ]}
              />
              <LabeledInput
                label={language === "zh" ? "开始日期" : "Start date"}
                type="date"
                value={weekStart}
                onChange={setWeekStart}
              />
              <LabeledSelect
                label={language === "zh" ? "项目筛选" : "Project filter"}
                value={projectFilterId}
                onChange={setProjectFilterId}
                options={[
                  { value: "", label: language === "zh" ? "全部项目" : "All projects" },
                  ...projectOptions,
                ]}
              />
              <LabeledInput
                label={language === "zh" ? "搜索资源" : "Search resources"}
                value={resourceQuery}
                onChange={setResourceQuery}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => shiftVisibleRange(-1)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {language === "zh" ? "前一段" : "Roll back"}
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(getWeekStartInputValue())}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {language === "zh" ? "回到本周" : "Today"}
              </button>
              <button
                type="button"
                onClick={() => shiftVisibleRange(1)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {language === "zh" ? "后一段" : "Roll forward"}
              </button>
              <button
                type="button"
                onClick={openBlankAllocationModal}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {language === "zh" ? "新增安排" : "New allocation"}
              </button>
            </div>

            {resourcePeople.length === 0 ? (
              <EmptyState
                message={
                  language === "zh"
                    ? "还没有可排班资源。请先运行资源计划迁移，或添加占位技术人员。"
                    : "No schedulable resources yet. Run the resource planning migration or add a placeholder technician."
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white">
                <div
                  className={cn("grid", viewMode === "week" ? "min-w-full" : "min-w-max")}
                  style={{
                    gridTemplateColumns: timelineGridTemplateColumns,
                  }}
                >
                  <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 p-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {language === "zh" ? "资源" : "Resource"}
                  </div>
                  {visibleDates.map((date) => (
                    <div
                      key={date}
                      className={cn(
                        "border-b border-r border-slate-200 bg-slate-50 p-3",
                        isWeekdayDate(date) ? "" : "bg-slate-100/70",
                      )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {formatDisplayDate(date, language).slice(0, 10)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {language === "zh"
                          ? ["日", "一", "二", "三", "四", "五", "六"][
                              new Date(`${date}T00:00:00`).getDay()
                            ]
                          : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                              new Date(`${date}T00:00:00`).getDay()
                            ]}
                      </p>
                    </div>
                  ))}

                  {visibleResources.length === 0 ? (
                    <div className="col-span-full p-4">
                      <EmptyState
                        message={
                          language === "zh"
                            ? "没有匹配当前筛选的资源安排。"
                            : "No resources match the current filters."
                        }
                      />
                    </div>
                  ) : (
                    visibleResources.map((resource) => {
                      const summary = getResourceSummary(resource);
                      const linkedProfile = profiles.find(
                        (profile) => profile.id === resource.linkedUserId,
                      );
                      const company = companies.find((item) => item.id === resource.homeCompanyId);
                      return (
                        <div key={resource.id} className="contents">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResourceId(resource.id);
                              setAllocationResourceId(resource.id);
                            }}
                            className={cn(
                              "sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50",
                              selectedResource?.id === resource.id && "bg-brand/5",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {resource.displayName}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {resource.title || linkedProfile?.email || company?.name || "--"}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ring-1",
                                  resource.resourceType === "placeholder"
                                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                                    : "bg-blue-50 text-blue-700 ring-blue-200",
                                )}
                              >
                                {resource.resourceType === "placeholder"
                                  ? language === "zh"
                                    ? "占位"
                                    : "Placeholder"
                                  : language === "zh"
                                    ? "用户"
                                    : "User"}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-[11px] font-semibold ring-1",
                                  getUtilizationClass(summary.maxUtilization),
                                )}
                              >
                                {summary.maxUtilization}%
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                {summary.plannedHours}h
                              </span>
                              {!resource.active ? (
                                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                  {language === "zh" ? "停用" : "Inactive"}
                                </span>
                              ) : null}
                            </div>
                          </button>
                          {visibleDates.map((date) => {
                            const day = getResourceDayData(resource, date);
                            return (
                              <div
                                key={`${resource.id}-${date}`}
                                role={day.allocations.length === 0 ? "button" : undefined}
                                tabIndex={day.allocations.length === 0 ? 0 : undefined}
                                onClick={() => beginAllocationForCell(resource, date)}
                                onKeyDown={
                                  day.allocations.length === 0
                                    ? (event) => handleCellKeyDown(event, resource, date)
                                    : undefined
                                }
                                className={cn(
                                  "min-h-[126px] cursor-pointer border-b border-r border-slate-100 p-2 outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40",
                                  isWeekdayDate(date) ? "bg-white" : "bg-slate-50/80",
                                  day.allocations.length === 0 && "hover:bg-brand/5",
                                  day.utilization > 100 && "bg-rose-50/70",
                                )}
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                                      getUtilizationClass(day.utilization),
                                    )}
                                  >
                                    {day.plannedHours}h
                                  </span>
                                  {day.leave ? (
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200">
                                      {language === "zh" ? "请假" : "Leave"}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="space-y-2">
                                  {day.allocations.map((allocation) => {
                                    const project = projects.find(
                                      (item) => item.id === allocation.projectId,
                                    );
                                    const colors = getProjectTimelineColor(
                                      allocation.projectId,
                                      projects,
                                    );
                                    return (
                                      <button
                                        type="button"
                                        key={allocation.id}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          loadAllocationForEdit(allocation);
                                        }}
                                        className="w-full rounded-xl border px-2 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                                        style={{
                                          backgroundColor: colors.background,
                                          borderColor: colors.border,
                                          color: colors.text,
                                        }}
                                      >
                                        <span className="block truncate font-semibold">
                                          {project?.name ?? allocation.projectId}
                                        </span>
                                        <span className="mt-1 block truncate text-[11px] opacity-80">
                                          {allocation.roleLabel ||
                                            (language === "zh" ? "现场支持" : "Field support")}
                                          {" · "}
                                          {allocation.status === "confirmed"
                                            ? language === "zh"
                                              ? "已确认"
                                              : "Confirmed"
                                            : language === "zh"
                                              ? "暂定"
                                              : "Tentative"}
                                        </span>
                                      </button>
                                    );
                                  })}
                                  {day.allocations.length === 0 ? (
                                    <span className="mt-3 inline-flex rounded-full border border-dashed border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-400">
                                      {language === "zh" ? "安排" : "Plan"}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardEyebrow>{language === "zh" ? "占位" : "Placeholder"}</CardEyebrow>
              <CardTitle>{language === "zh" ? "添加非平台技术人员" : "Add non-user technician"}</CardTitle>
              <CardDescription>
                {language === "zh"
                  ? "用于还未创建账号、外包或临时人员的计划排班。"
                  : "Use placeholders for contractors, temporary techs, or people without accounts yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <LabeledInput
                label={language === "zh" ? "名称" : "Name"}
                value={placeholderName}
                onChange={setPlaceholderName}
              />
              <LabeledInput
                label={language === "zh" ? "职能" : "Title"}
                value={placeholderTitle}
                onChange={setPlaceholderTitle}
              />
              <LabeledSelect
                label={language === "zh" ? "归属公司" : "Home company"}
                value={placeholderCompanyId}
                onChange={setPlaceholderCompanyId}
                options={[
                  { value: "", label: language === "zh" ? "未指定" : "Not set" },
                  ...companies.map((company) => ({
                    label: company.name,
                    value: company.id,
                  })),
                ]}
              />
              <LabeledInput
                label={language === "zh" ? "每日容量小时" : "Capacity hours / day"}
                type="number"
                value={placeholderCapacity}
                onChange={setPlaceholderCapacity}
              />
              <LabeledTextarea
                label={language === "zh" ? "技能标签" : "Skills"}
                value={placeholderSkills}
                onChange={setPlaceholderSkills}
                rows={2}
              />
              <button
                type="button"
                onClick={handleCreatePlaceholder}
                className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                {language === "zh" ? "添加占位资源" : "Add placeholder"}
              </button>
            </CardContent>
          </Card>
        </div>
      </section>

      {isAllocationModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onClick={closeAllocationModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                  {language === "zh" ? "资源安排" : "Allocation"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {editingAllocationId
                    ? language === "zh"
                      ? "编辑排班"
                      : "Edit schedule"
                    : language === "zh"
                      ? "安排资源"
                      : "Schedule resource"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {allocationResource?.displayName ?? (language === "zh" ? "未选择资源" : "No resource selected")}
                  {" · "}
                  {allocationStartDate ? formatDisplayDate(allocationStartDate, language) : "--"}
                  {allocationEndDate && allocationEndDate !== allocationStartDate
                    ? ` - ${formatDisplayDate(allocationEndDate, language)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAllocationModal}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {language === "zh" ? "关闭" : "Close"}
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {language === "zh" ? "资源" : "Resource"}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                    {allocationResource?.displayName ?? "--"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {allocationResource
                      ? `${allocationResource.capacityHoursPerDay}h / ${
                          language === "zh" ? "天" : "day"
                        }`
                      : "--"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {language === "zh" ? "项目" : "Project"}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                    {allocationProjectContext?.projectName ?? "--"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {allocationProjectContext
                      ? `${allocationProjectContext.clientName} / ${allocationProjectContext.siteName}`
                      : "--"}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-2xl p-3",
                    allocationStatus === "confirmed" ? "bg-emerald-50" : "bg-amber-50",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {language === "zh" ? "状态" : "Status"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-sm font-semibold",
                      allocationStatus === "confirmed" ? "text-emerald-700" : "text-amber-700",
                    )}
                  >
                    {allocationStatus === "confirmed"
                      ? language === "zh"
                        ? "已确认"
                        : "Confirmed"
                      : language === "zh"
                        ? "暂定"
                        : "Tentative"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {allocationHours || "0"}h / {allocationPercent || "0"}%
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <LabeledSelect
                  label={language === "zh" ? "资源" : "Resource"}
                  value={effectiveAllocationResourceId}
                  onChange={setAllocationResourceId}
                  options={
                    resourcePeople.length > 0
                      ? resourcePeople.map((resource) => ({
                          label: resource.displayName,
                          value: resource.id,
                        }))
                      : [{ value: "", label: language === "zh" ? "暂无资源" : "No resources" }]
                  }
                />
                <LabeledSelect
                  label={language === "zh" ? "项目" : "Project"}
                  value={effectiveAllocationProjectId}
                  onChange={setAllocationProjectId}
                  options={
                    projectOptions.length > 0
                      ? projectOptions
                      : [{ value: "", label: language === "zh" ? "暂无项目" : "No projects" }]
                  }
                />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <LabeledInput
                  label={language === "zh" ? "开始" : "Start"}
                  type="date"
                  value={allocationStartDate}
                  onChange={setAllocationStartDate}
                />
                <LabeledInput
                  label={language === "zh" ? "结束" : "End"}
                  type="date"
                  value={allocationEndDate}
                  onChange={setAllocationEndDate}
                />
                <LabeledInput
                  label={language === "zh" ? "每日小时" : "Hours / day"}
                  type="number"
                  value={allocationHours}
                  onChange={setAllocationHours}
                />
                <LabeledInput
                  label={language === "zh" ? "使用率 %" : "Allocation %"}
                  type="number"
                  value={allocationPercent}
                  onChange={setAllocationPercent}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_0.55fr]">
                <LabeledInput
                  label={language === "zh" ? "角色 / 工作" : "Role / work"}
                  value={allocationRole}
                  onChange={setAllocationRole}
                />
                <LabeledSelect
                  label={language === "zh" ? "状态" : "Status"}
                  value={allocationStatus}
                  onChange={(value) => setAllocationStatus(value as ResourceAllocation["status"])}
                  options={[
                    { value: "tentative", label: language === "zh" ? "暂定" : "Tentative" },
                    { value: "confirmed", label: language === "zh" ? "已确认" : "Confirmed" },
                  ]}
                />
              </div>

              <LabeledTextarea
                label={language === "zh" ? "备注" : "Notes"}
                value={allocationNotes}
                onChange={setAllocationNotes}
                rows={2}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveAllocation}
                  disabled={!canSaveAllocation}
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm font-semibold text-white transition",
                    canSaveAllocation
                      ? "bg-brand hover:bg-brand-dark"
                      : "cursor-not-allowed bg-slate-300",
                  )}
                >
                  {editingAllocationId
                    ? language === "zh"
                      ? "保存排班"
                      : "Save schedule"
                    : language === "zh"
                      ? "创建排班"
                      : "Create schedule"}
                </button>
                <button
                  type="button"
                  onClick={closeAllocationModal}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {language === "zh" ? "取消" : "Cancel"}
                </button>
              </div>
              {editingAllocationId ? (
                <button
                  type="button"
                  onClick={handleDeleteAllocation}
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  {language === "zh" ? "删除排班" : "Delete schedule"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
