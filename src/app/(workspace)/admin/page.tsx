"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/providers/app-provider";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ResourcePlannerWorkspace } from "@/components/resource-planner-workspace";
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
import { siteTimezoneOptions } from "@/lib/form-options";
import type {
  AttendanceLog,
  Client,
  Company,
  DailyReport,
  Profile,
  Project,
  ProjectAssignment,
  ProjectCompanyShare,
  Site,
} from "@/lib/types";
import {
  cn,
  formatDisplayDate,
  formatDisplayDateTime,
  formatDisplayTime,
  getLocalDateString,
} from "@/lib/utils";

type AdminTab =
  | "account"
  | "overview"
  | "resources"
  | "users"
  | "structure"
  | "network"
  | "contacts"
  | "audit";
type StructureView = "organization" | "delivery";
type DeliveryWorkspaceView = "client" | "site" | "project";
type UserWorkspaceView = "profile" | "new_assignment" | "assignment";
type HistoryRecordKind = "all" | "attendance" | "reports";

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

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
      {children}
    </div>
  );
}

function TreeShell({
  title,
  subtitle,
  countLabel,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  countLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="rounded-[28px] border border-slate-200 bg-white"
    >
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-slate-950">{title}</p>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {countLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {countLabel}
            </span>
          ) : null}
        </div>
      </summary>
      <div className="border-t border-slate-200 px-5 py-5">{children}</div>
    </details>
  );
}

function StructurePanel({
  title,
  description,
  countLabel,
  children,
}: {
  title: string;
  description: string;
  countLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {countLabel ? (
          <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {countLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function WorkspaceBoard({
  children,
  columnsClassName,
}: {
  children: React.ReactNode;
  columnsClassName: string;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
      <div className={cn("grid", columnsClassName)}>{children}</div>
    </section>
  );
}

function WorkspaceColumn({
  title,
  description,
  countLabel,
  divided = false,
  className,
  children,
}: {
  title: string;
  description: string;
  countLabel?: string;
  divided?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 p-5 sm:p-6",
        divided && "border-t border-slate-200 xl:border-l xl:border-t-0",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {countLabel ? (
          <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {countLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function getRoleLabel(role: Profile["role"], language: "en" | "zh") {
  if (role === "operations_manager") {
    return language === "zh" ? "运营经理" : "Operations Manager";
  }

  return language === "zh" ? "现场工程师" : "Service Engineer";
}

function getProjectContext(
  projectId: string,
  projects: Project[],
  clients: Client[],
  sites: Site[],
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

function getMonthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthCalendarCells(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  if (!year || !month) {
    return [] as Array<string | null>;
  }

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<string | null> = Array.from(
    { length: firstDay.getDay() },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function isWeekdayDate(dateValue: string) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  return day !== 0 && day !== 6;
}

function getAttendanceLabel(status: string, language: "en" | "zh") {
  const labels = {
    present: { en: "Present", zh: "正常" },
    partial: { en: "Clocked in", zh: "已上班" },
    missing_clock_out: { en: "Missing out", zh: "缺下班卡" },
    missing_clock_in: { en: "Missing in", zh: "缺上班卡" },
    leave: { en: "Leave", zh: "请假" },
  } as const;

  return labels[status as keyof typeof labels]?.[language] ?? status;
}

function getAttendancePillClass(status: string) {
  if (status === "present") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "leave") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "partial") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function HierarchyNodeShell({
  title,
  subtitle,
  countLabel,
  defaultOpen = false,
  level = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  countLabel?: string;
  defaultOpen?: boolean;
  level?: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className={cn("py-1", level > 0 ? "ml-4 border-l border-slate-200 pl-4" : "")}
    >
      <summary className="cursor-pointer list-none">
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-3 rounded-2xl px-4 py-3 transition",
            level === 0
              ? "border border-slate-200 bg-white hover:border-slate-300"
              : "bg-transparent hover:bg-white",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "mt-1.5 h-2.5 w-2.5 flex-none rounded-full",
                level === 0 ? "bg-brand" : level === 1 ? "bg-slate-400" : "bg-slate-300",
              )}
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-950">{title}</p>
              {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
          </div>
          {countLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {countLabel}
            </span>
          ) : null}
        </div>
      </summary>
      <div className={cn("mt-3 space-y-4 border-l border-slate-200", level === 0 ? "ml-5 pl-5" : "ml-2 pl-4")}>
        {children}
      </div>
    </details>
  );
}

function ProjectRelationshipSummary({
  project,
  companies,
  sites,
  shares,
  language,
}: {
  project: Project;
  companies: Company[];
  sites: Site[];
  shares: ProjectCompanyShare[];
  language: "en" | "zh";
}) {
  const shareNames = shares
    .filter((share) => share.projectId === project.id && share.active)
    .map((share) => companies.find((company) => company.id === share.companyId)?.name)
    .filter(Boolean);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{project.name}</p>
          <p className="text-sm text-slate-500">
            {sites.find((site) => site.id === project.siteId)?.name ?? "--"}
          </p>
        </div>
        <Badge tone={project.status === "active" ? "success" : project.status === "planning" ? "accent" : "neutral"}>
          {project.status}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="brand">
          {language === "zh" ? "负责公司" : "Owner"}:{" "}
          {companies.find((company) => company.id === project.managingCompanyId)?.name ?? "--"}
        </Badge>
        <Badge tone="signal">
          {language === "zh" ? "客户侧显示" : "Shown to customer"}:{" "}
          {companies.find((company) => company.id === project.customerFacingCompanyId)?.name ?? "--"}
        </Badge>
        {shareNames.length === 0 ? (
          <Badge tone="neutral">
            {language === "zh" ? "未共享" : "Not shared"}
          </Badge>
        ) : (
          shareNames.map((name) => (
            <Badge key={name} tone="accent">
              {language === "zh" ? "共享给" : "Shared with"}: {name}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

function CompanyNode({
  company,
  projects,
  sites,
  shares,
  companies,
  language,
  updateCompany,
  onNotify,
}: {
  company: Company;
  projects: Project[];
  sites: Site[];
  shares: ProjectCompanyShare[];
  companies: Company[];
  language: "en" | "zh";
  updateCompany: (payload: {
    id: string;
    name: string;
    legalName: string;
    primaryColor: string;
    supportEmail: string;
    brandLine: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
}) {
  const [name, setName] = useState(company.name);
  const [legalName, setLegalName] = useState(company.legalName);
  const [primaryColor, setPrimaryColor] = useState(company.primaryColor ?? "#0f766e");
  const [supportEmail, setSupportEmail] = useState(company.supportEmail ?? "");
  const [brandLine, setBrandLine] = useState(company.brandLine ?? "");

  const relatedProjects = projects.filter((project) => {
    const sharedHere = shares.some(
      (share) => share.projectId === project.id && share.companyId === company.id && share.active,
    );

    return (
      project.managingCompanyId === company.id ||
      project.customerFacingCompanyId === company.id ||
      sharedHere
    );
  });

  async function handleSave() {
    const result = await updateCompany({
      id: company.id,
      name,
      legalName,
      primaryColor,
      supportEmail,
      brandLine,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "公司信息已更新。"
          : "Company updated."
        : result.error ?? "",
    );
  }

  return (
    <HierarchyNodeShell
      title={company.name}
      subtitle={company.legalName}
      countLabel={`${relatedProjects.length} ${language === "zh" ? "项目" : "projects"}`}
      level={0}
    >
      <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label={language === "zh" ? "公司名称" : "Company name"}
              value={name}
              onChange={setName}
            />
            <LabeledInput
              label={language === "zh" ? "法定名称" : "Legal name"}
              value={legalName}
              onChange={setLegalName}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label={language === "zh" ? "主色" : "Primary color"}
              value={primaryColor}
              onChange={setPrimaryColor}
              type="color"
            />
            <LabeledInput
              label={language === "zh" ? "支持邮箱" : "Support email"}
              value={supportEmail}
              onChange={setSupportEmail}
              type="email"
            />
          </div>
          <LabeledInput
            label={language === "zh" ? "品牌说明" : "Brand line"}
            value={brandLine}
            onChange={setBrandLine}
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {language === "zh" ? "保存公司" : "Save company"}
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">
            {language === "zh" ? "关联项目" : "Linked projects"}
          </p>
          {relatedProjects.length === 0 ? (
            <EmptyState
              message={
                language === "zh"
                  ? "这个公司目前还没有关联项目。"
                  : "This company is not linked to any project yet."
              }
            />
          ) : (
            relatedProjects.map((project) => (
              <ProjectRelationshipSummary
                key={project.id}
                project={project}
                companies={companies}
                sites={sites}
                shares={shares}
                language={language}
              />
            ))
          )}
        </div>
      </div>
    </HierarchyNodeShell>
  );
}

function ProjectNode({
  project,
  clients,
  sites,
  companies,
  shares,
  language,
  updateProjectRecord,
  onNotify,
  level = 2,
  defaultOpen = false,
  embedded = false,
}: {
  project: Project;
  clients: Client[];
  sites: Site[];
  companies: Company[];
  shares: ProjectCompanyShare[];
  language: "en" | "zh";
  updateProjectRecord: (payload: {
    id: string;
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
    status: "active" | "planning" | "paused";
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
  level?: number;
  defaultOpen?: boolean;
  embedded?: boolean;
}) {
  const [clientId, setClientId] = useState(project.clientId);
  const [siteId, setSiteId] = useState(project.siteId);
  const [name, setName] = useState(project.name);
  const [managingCompanyId, setManagingCompanyId] = useState(project.managingCompanyId);
  const [customerFacingCompanyId, setCustomerFacingCompanyId] = useState(
    project.customerFacingCompanyId,
  );
  const [shiftStartTime, setShiftStartTime] = useState(project.shiftStartTime ?? "07:30");
  const [shiftEndTime, setShiftEndTime] = useState(project.shiftEndTime ?? "17:30");
  const [status, setStatus] = useState<Project["status"]>(project.status);
  const [sharedCompanyIds, setSharedCompanyIds] = useState<string[]>(
    shares
      .filter((share) => share.projectId === project.id && share.active)
      .map((share) => share.companyId),
  );

  const availableSites = sites.filter((site) => site.clientId === clientId);

  async function handleSave() {
    const result = await updateProjectRecord({
      id: project.id,
      clientId,
      siteId,
      name,
      managingCompanyId,
      customerFacingCompanyId,
      shiftStartTime,
      shiftEndTime,
      sharedCompanyIds,
      status,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "项目信息已更新。"
          : "Project updated."
        : result.error ?? "",
    );
  }

  const content = (
    <div className="space-y-4">
      <ProjectRelationshipSummary
        project={{
          ...project,
          clientId,
          siteId,
          name,
          managingCompanyId,
          customerFacingCompanyId,
          status,
        }}
        companies={companies}
        sites={sites}
        shares={sharedCompanyIds.map((companyId, index) => ({
          id: `${project.id}-${companyId}-${index}`,
          projectId: project.id,
          companyId,
          active: true,
        }))}
        language={language}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledInput
          label={language === "zh" ? "项目名称" : "Project name"}
          value={name}
          onChange={setName}
        />
        <LabeledSelect
          label={language === "zh" ? "状态" : "Status"}
          value={status}
          onChange={(value) => setStatus(value as Project["status"])}
          options={[
            { value: "planning", label: language === "zh" ? "规划中" : "Planning" },
            { value: "active", label: language === "zh" ? "进行中" : "Active" },
            { value: "paused", label: language === "zh" ? "暂停" : "Paused" },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledSelect
          label={language === "zh" ? "客户" : "Client"}
          value={clientId}
          onChange={(value) => {
            setClientId(value);
            const nextSite = sites.find((site) => site.clientId === value);
            setSiteId(nextSite?.id ?? "");
          }}
          options={clients.map((client) => ({ label: client.name, value: client.id }))}
        />
        <LabeledSelect
          label={language === "zh" ? "站点" : "Site"}
          value={siteId}
          onChange={setSiteId}
          options={availableSites.map((site) => ({ label: site.name, value: site.id }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledSelect
          label={language === "zh" ? "负责公司" : "Owner company"}
          value={managingCompanyId}
          onChange={setManagingCompanyId}
          options={companies.map((company) => ({ label: company.name, value: company.id }))}
        />
        <LabeledSelect
          label={language === "zh" ? "客户侧显示公司" : "Shown to customer"}
          value={customerFacingCompanyId}
          onChange={setCustomerFacingCompanyId}
          options={companies.map((company) => ({ label: company.name, value: company.id }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledInput
          label={language === "zh" ? "班次开始" : "Shift start"}
          value={shiftStartTime}
          onChange={setShiftStartTime}
          type="time"
        />
        <LabeledInput
          label={language === "zh" ? "班次结束" : "Shift end"}
          value={shiftEndTime}
          onChange={setShiftEndTime}
          type="time"
        />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">
          {language === "zh" ? "共享给公司" : "Shared with companies"}
        </p>
        <div className="flex flex-wrap gap-2">
          {companies
            .filter((company) => company.id !== managingCompanyId)
            .map((company) => {
              const active = sharedCompanyIds.includes(company.id);

              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() =>
                    setSharedCompanyIds((current) =>
                      current.includes(company.id)
                        ? current.filter((item) => item !== company.id)
                        : [...current, company.id],
                    )
                  }
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-brand text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  {company.name}
                </button>
              );
            })}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
      >
        {language === "zh" ? "保存项目" : "Save project"}
      </button>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <HierarchyNodeShell
      title={project.name}
      subtitle={`${clients.find((client) => client.id === clientId)?.name ?? "--"} · ${
        sites.find((site) => site.id === siteId)?.name ?? "--"
      }`}
      countLabel={
        project.isShared
          ? language === "zh"
            ? "已共享"
            : "shared"
          : language === "zh"
            ? "内部"
            : "internal"
      }
      level={level}
      defaultOpen={defaultOpen}
    >
      {content}
    </HierarchyNodeShell>
  );
}

function SiteNode({
  site,
  clients,
  sites,
  companies,
  projects,
  shares,
  language,
  updateSiteRecord,
  createProjectRecord,
  updateProjectRecord,
  onNotify,
  level = 1,
  defaultOpen = false,
  embedded = false,
  showProjectList = true,
}: {
  site: Site;
  clients: Client[];
  sites: Site[];
  companies: Company[];
  projects: Project[];
  shares: ProjectCompanyShare[];
  language: "en" | "zh";
  updateSiteRecord: (payload: {
    id: string;
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createProjectRecord: (payload: {
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  updateProjectRecord: (payload: {
    id: string;
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
    status: "active" | "planning" | "paused";
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
  level?: number;
  defaultOpen?: boolean;
  embedded?: boolean;
  showProjectList?: boolean;
}) {
  const [name, setName] = useState(site.name);
  const [address, setAddress] = useState(site.address ?? "");
  const [timezone, setTimezone] = useState(site.timezone);
  const [projectName, setProjectName] = useState("");
  const [managingCompanyId, setManagingCompanyId] = useState(companies[0]?.id ?? "");
  const [customerFacingCompanyId, setCustomerFacingCompanyId] = useState(companies[0]?.id ?? "");
  const [shiftStartTime, setShiftStartTime] = useState("07:30");
  const [shiftEndTime, setShiftEndTime] = useState("17:30");
  const [sharedCompanyIds, setSharedCompanyIds] = useState<string[]>([]);

  const siteProjects = projects.filter((project) => project.siteId === site.id);

  async function handleSaveSite() {
    const result = await updateSiteRecord({
      id: site.id,
      clientId: site.clientId,
      name,
      address,
      timezone,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "站点信息已更新。"
          : "Site updated."
        : result.error ?? "",
    );
  }

  async function handleCreateProject() {
    const result = await createProjectRecord({
      clientId: site.clientId,
      siteId: site.id,
      name: projectName,
      managingCompanyId,
      customerFacingCompanyId,
      shiftStartTime,
      shiftEndTime,
      sharedCompanyIds,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "项目已创建。"
          : "Project created."
        : result.error ?? "",
    );

    if (result.ok) {
      setProjectName("");
      setSharedCompanyIds([]);
    }
  }

  const content = (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label={language === "zh" ? "站点名称" : "Site name"}
              value={name}
              onChange={setName}
            />
            <LabeledSelect
              label={language === "zh" ? "时区" : "Timezone"}
              value={timezone}
              onChange={setTimezone}
              options={siteTimezoneOptions}
            />
          </div>
          <LabeledTextarea
            label={language === "zh" ? "地址" : "Address"}
            value={address}
            onChange={setAddress}
          />
          <button
            type="button"
            onClick={() => void handleSaveSite()}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {language === "zh" ? "保存站点" : "Save site"}
          </button>
        </div>

        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="font-medium text-slate-900">
              {language === "zh" ? "在该站点下创建项目" : "Create project under this site"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {language === "zh"
                ? "项目会自动挂到当前客户和当前站点。"
                : "The new project will be linked to this client and site automatically."}
            </p>
          </div>
          <LabeledInput
            label={language === "zh" ? "项目名称" : "Project name"}
            value={projectName}
            onChange={setProjectName}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledSelect
              label={language === "zh" ? "负责公司" : "Owner company"}
              value={managingCompanyId}
              onChange={setManagingCompanyId}
              options={companies.map((company) => ({ label: company.name, value: company.id }))}
            />
            <LabeledSelect
              label={language === "zh" ? "客户侧显示公司" : "Shown to customer"}
              value={customerFacingCompanyId}
              onChange={setCustomerFacingCompanyId}
              options={companies.map((company) => ({ label: company.name, value: company.id }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label={language === "zh" ? "班次开始" : "Shift start"}
              value={shiftStartTime}
              onChange={setShiftStartTime}
              type="time"
            />
            <LabeledInput
              label={language === "zh" ? "班次结束" : "Shift end"}
              value={shiftEndTime}
              onChange={setShiftEndTime}
              type="time"
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">
              {language === "zh" ? "共享给公司" : "Shared with companies"}
            </p>
            <div className="flex flex-wrap gap-2">
              {companies
                .filter((company) => company.id !== managingCompanyId)
                .map((company) => {
                  const active = sharedCompanyIds.includes(company.id);

                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() =>
                        setSharedCompanyIds((current) =>
                          current.includes(company.id)
                            ? current.filter((item) => item !== company.id)
                            : [...current, company.id],
                        )
                      }
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        active
                          ? "bg-brand text-white"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                      )}
                    >
                      {company.name}
                    </button>
                  );
                })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCreateProject()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {language === "zh" ? "创建项目" : "Create project"}
          </button>
        </div>
      </div>

      {showProjectList ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">
            {language === "zh" ? "站点下的项目" : "Projects under this site"}
          </p>
          {siteProjects.length === 0 ? (
            <EmptyState
              message={
                language === "zh"
                  ? "这个站点下还没有项目。"
                  : "No project has been added under this site yet."
              }
            />
          ) : (
            siteProjects.map((project) => (
              <ProjectNode
                key={project.id}
                project={project}
                clients={clients}
                sites={sites}
                companies={companies}
                shares={shares}
                language={language}
                updateProjectRecord={updateProjectRecord}
                onNotify={onNotify}
                level={level + 1}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <HierarchyNodeShell
      title={site.name}
      subtitle={site.address ?? site.timezone}
      countLabel={`${siteProjects.length} ${language === "zh" ? "项目" : "projects"}`}
      level={level}
      defaultOpen={defaultOpen}
    >
      {content}
    </HierarchyNodeShell>
  );
}

function ClientNode({
  client,
  clients,
  sites,
  companies,
  projects,
  shares,
  language,
  updateClientRecord,
  createSiteRecord,
  updateSiteRecord,
  createProjectRecord,
  updateProjectRecord,
  onNotify,
  defaultOpen = false,
  embedded = false,
  showSiteExplorer = true,
}: {
  client: Client;
  clients: Client[];
  sites: Site[];
  companies: Company[];
  projects: Project[];
  shares: ProjectCompanyShare[];
  language: "en" | "zh";
  updateClientRecord: (payload: {
    id: string;
    name: string;
    externalCode: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createSiteRecord: (payload: {
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateSiteRecord: (payload: {
    id: string;
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createProjectRecord: (payload: {
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  updateProjectRecord: (payload: {
    id: string;
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
    status: "active" | "planning" | "paused";
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
  defaultOpen?: boolean;
  embedded?: boolean;
  showSiteExplorer?: boolean;
}) {
  const [name, setName] = useState(client.name);
  const [externalCode, setExternalCode] = useState(client.externalCode ?? "");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteTimezone, setSiteTimezone] = useState("America/New_York");
  const [siteQuery, setSiteQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const clientSites = sites.filter((site) => site.clientId === client.id);
  const filteredSites = clientSites.filter((site) => {
    const search = `${site.name} ${site.address ?? ""}`.toLowerCase();
    return siteQuery.trim() ? search.includes(siteQuery.trim().toLowerCase()) : true;
  });
  const selectedSite =
    filteredSites.find((site) => site.id === selectedSiteId) ??
    clientSites.find((site) => site.id === selectedSiteId) ??
    filteredSites[0] ??
    clientSites[0] ??
    null;

  async function handleSaveClient() {
    const result = await updateClientRecord({
      id: client.id,
      name,
      externalCode,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "客户信息已更新。"
          : "Client updated."
        : result.error ?? "",
    );
  }

  async function handleCreateSite() {
    const result = await createSiteRecord({
      clientId: client.id,
      name: siteName,
      address: siteAddress,
      timezone: siteTimezone,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "站点已创建。"
          : "Site created."
        : result.error ?? "",
    );

    if (result.ok) {
      setSiteName("");
      setSiteAddress("");
    }
  }

  const content = (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          <LabeledInput
            label={language === "zh" ? "客户名称" : "Client name"}
            value={name}
            onChange={setName}
          />
          <LabeledInput
            label={language === "zh" ? "外部编码" : "External code"}
            value={externalCode}
            onChange={setExternalCode}
          />
          <button
            type="button"
            onClick={() => void handleSaveClient()}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {language === "zh" ? "保存客户" : "Save client"}
          </button>
        </div>

        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="font-medium text-slate-900">
              {language === "zh" ? "在该客户下创建站点" : "Create site under this client"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {language === "zh"
                ? "站点创建后，可以继续在站点节点下创建项目。"
                : "After the site is created, you can add projects inside the site node."}
            </p>
          </div>
          <LabeledInput
            label={language === "zh" ? "站点名称" : "Site name"}
            value={siteName}
            onChange={setSiteName}
          />
          <LabeledTextarea
            label={language === "zh" ? "地址" : "Address"}
            value={siteAddress}
            onChange={setSiteAddress}
          />
          <LabeledSelect
            label={language === "zh" ? "时区" : "Timezone"}
            value={siteTimezone}
            onChange={setSiteTimezone}
            options={siteTimezoneOptions}
          />
          <button
            type="button"
            onClick={() => void handleCreateSite()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {language === "zh" ? "创建站点" : "Create site"}
          </button>
        </div>
      </div>

      {showSiteExplorer ? (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                {language === "zh" ? "站点子列表" : "Site sublist"}
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredSites.length} / {clientSites.length}
              </span>
            </div>
            <LabeledInput
              label={language === "zh" ? "搜索站点" : "Search sites"}
              value={siteQuery}
              onChange={setSiteQuery}
              type="search"
            />
            <div className="space-y-2">
              {filteredSites.length === 0 ? (
                <EmptyState
                  message={
                    language === "zh"
                      ? "当前客户下没有匹配的站点。"
                      : "No site under this client matches the current search."
                  }
                />
              ) : (
                filteredSites.map((site) => {
                  const projectCount = projects.filter((project) => project.siteId === site.id).length;
                  const active = selectedSite?.id === site.id;

                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => setSelectedSiteId(site.id)}
                      className={cn(
                        "w-full rounded-[22px] border px-4 py-4 text-left transition",
                        active
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      <p className="font-semibold">{site.name}</p>
                      <p className={cn("mt-1 text-xs", active ? "text-white/70" : "text-slate-500")}>
                        {site.address || site.timezone}
                      </p>
                      <div className={cn("mt-3 text-xs", active ? "text-white/80" : "text-slate-600")}>
                        {projectCount} {language === "zh" ? "项目" : "projects"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">
              {language === "zh" ? "详情" : "Details"}
            </p>
            {selectedSite ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <SiteNode
                  site={selectedSite}
                  clients={clients}
                  sites={sites}
                  companies={companies}
                  projects={projects}
                  shares={shares}
                  language={language}
                  updateSiteRecord={updateSiteRecord}
                  createProjectRecord={createProjectRecord}
                  updateProjectRecord={updateProjectRecord}
                  onNotify={onNotify}
                  embedded
                  level={0}
                />
              </div>
            ) : (
              <EmptyState
                message={
                  language === "zh"
                    ? "先从左侧选择一个站点，再维护项目。"
                    : "Choose a site on the left before managing its projects."
                }
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <HierarchyNodeShell
      title={client.name}
      subtitle={client.externalCode ?? (language === "zh" ? "暂无外部编码" : "No external code")}
      countLabel={`${clientSites.length} ${language === "zh" ? "站点" : "sites"}`}
      level={0}
      defaultOpen={defaultOpen}
    >
      {content}
    </HierarchyNodeShell>
  );
}

function DeliveryHierarchyWorkspace({
  clients,
  sites,
  companies,
  projects,
  shares,
  language,
  updateClientRecord,
  createSiteRecord,
  updateSiteRecord,
  createProjectRecord,
  updateProjectRecord,
  onNotify,
}: {
  clients: Client[];
  sites: Site[];
  companies: Company[];
  projects: Project[];
  shares: ProjectCompanyShare[];
  language: "en" | "zh";
  updateClientRecord: (payload: {
    id: string;
    name: string;
    externalCode: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createSiteRecord: (payload: {
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateSiteRecord: (payload: {
    id: string;
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createProjectRecord: (payload: {
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  updateProjectRecord: (payload: {
    id: string;
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
    status: "active" | "planning" | "paused";
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [resourceQuery, setResourceQuery] = useState("");
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<DeliveryWorkspaceView>("client");

  const clientSummaries = useMemo(
    () =>
      clients.map((client) => {
        const clientSites = sites.filter((site) => site.clientId === client.id);
        const clientProjects = projects.filter((project) => project.clientId === client.id);
        const searchable = [client.name, client.externalCode ?? ""].join(" ").toLowerCase();

        return {
          client,
          siteCount: clientSites.length,
          projectCount: clientProjects.length,
          activeProjectCount: clientProjects.filter((project) => project.status === "active").length,
          searchable,
        };
      }),
    [clients, projects, sites],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredClientSummaries = useMemo(
    () =>
      clientSummaries.filter((summary) =>
        normalizedQuery ? summary.searchable.includes(normalizedQuery) : true,
      ),
    [clientSummaries, normalizedQuery],
  );

  const selectedSummary = normalizedQuery
    ? filteredClientSummaries.find((summary) => summary.client.id === selectedClientId) ??
      filteredClientSummaries[0] ??
      null
    : clientSummaries.find((summary) => summary.client.id === selectedClientId) ??
      clientSummaries[0] ??
      null;
  const selectedClient = selectedSummary?.client ?? null;
  const sitesForClient = selectedClient
    ? sites.filter((site) => site.clientId === selectedClient.id)
    : [];
  const projectsForClient = selectedClient
    ? projects.filter((project) => project.clientId === selectedClient.id)
    : [];
  const selectedSite = sitesForClient.find((site) => site.id === selectedSiteId) ?? null;
  const selectedProject = projectsForClient.find((project) => project.id === selectedProjectId) ?? null;
  const normalizedResourceQuery = resourceQuery.trim().toLowerCase();
  const siteSections = sitesForClient
    .map((site) => {
      const siteProjects = projectsForClient.filter((project) => project.siteId === site.id);
      const siteMatches = `${site.name} ${site.address ?? ""} ${site.timezone}`
        .toLowerCase()
        .includes(normalizedResourceQuery);
      const matchingProjects = siteProjects.filter((project) => {
        const context = getProjectContext(project.id, projects, clients, sites);
        return `${context.optionLabel} ${project.status}`.toLowerCase().includes(normalizedResourceQuery);
      });
      const includeSite = normalizedResourceQuery ? siteMatches || matchingProjects.length > 0 : true;
      const shouldExpand =
        expandedSiteId === site.id ||
        selectedSiteId === site.id ||
        selectedProject?.siteId === site.id ||
        (normalizedResourceQuery.length > 0 && matchingProjects.length > 0);

      return {
        site,
        siteProjects,
        matchingProjects,
        includeSite,
        shouldExpand,
      };
    })
    .filter((section) => section.includeSite);

  return (
    <WorkspaceBoard columnsClassName="xl:grid-cols-[280px_300px_minmax(0,1fr)] 2xl:grid-cols-[300px_320px_minmax(0,1fr)]">
      <WorkspaceColumn
        title={language === "zh" ? "客户" : "Clients"}
        description={
          language === "zh"
            ? "先找到客户，再继续选择对应的站点或项目。"
            : "Find the client first, then continue with the matching site or project."
        }
        countLabel={`${filteredClientSummaries.length} / ${clients.length}`}
      >
        <div className="space-y-4">
          <LabeledInput
            label={language === "zh" ? "搜索客户" : "Search clients"}
            value={query}
            onChange={setQuery}
            type="search"
          />
          <div className="space-y-2">
            {filteredClientSummaries.length === 0 ? (
              <EmptyState
                message={
                  language === "zh"
                    ? "没有匹配的客户、站点或项目。"
                    : "No client, site, or project matches the current search."
                }
              />
            ) : (
              filteredClientSummaries.map((summary) => {
                const active = selectedSummary?.client.id === summary.client.id;

                return (
                  <button
                    key={summary.client.id}
                    type="button"
                    onClick={() => {
                      setSelectedClientId(summary.client.id);
                      setSelectedSiteId(null);
                      setSelectedProjectId(null);
                      setExpandedSiteId(null);
                      setDetailView("client");
                    }}
                    className={cn(
                      "w-full rounded-[24px] border px-4 py-4 text-left transition",
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{summary.client.name}</p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            active ? "text-white/70" : "text-slate-500",
                          )}
                        >
                          {summary.client.externalCode ||
                            (language === "zh" ? "未设置外部编码" : "No external code")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          active ? "bg-white/14 text-white" : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {summary.activeProjectCount} {language === "zh" ? "进行中" : "active"}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "mt-3 flex flex-wrap gap-2 text-xs",
                        active ? "text-white/80" : "text-slate-600",
                      )}
                    >
                      <span>{summary.siteCount} {language === "zh" ? "站点" : "sites"}</span>
                      <span>{summary.projectCount} {language === "zh" ? "项目" : "projects"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </WorkspaceColumn>

      <WorkspaceColumn
        divided
        title={language === "zh" ? "站点与项目" : "Sites & projects"}
        description={
          selectedSummary
            ? language === "zh"
              ? "先选站点，再进入项目。右侧只显示你当前正在处理的内容。"
              : "Pick the site first, then move into projects. The right side only shows what you are editing now."
            : language === "zh"
              ? "先从左侧选择一个客户。"
              : "Select a client on the left first."
        }
        countLabel={
          selectedSummary
            ? `${selectedSummary.siteCount} ${language === "zh" ? "站点" : "sites"} · ${selectedSummary.projectCount} ${language === "zh" ? "项目" : "projects"}`
            : undefined
        }
      >
        {selectedClient ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setSelectedSiteId(null);
                setSelectedProjectId(null);
                setDetailView("client");
              }}
              className={cn(
                "w-full rounded-[24px] border px-4 py-4 text-left transition",
                detailView === "client"
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <p className="truncate font-semibold">{selectedClient.name}</p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  detailView === "client" ? "text-white/70" : "text-slate-500",
                )}
              >
                {selectedClient.externalCode || (language === "zh" ? "编辑客户与新增站点" : "Edit client and add sites")}
              </p>
            </button>

            <LabeledInput
              label={language === "zh" ? "搜索站点 / 项目" : "Search sites / projects"}
              value={resourceQuery}
              onChange={setResourceQuery}
              type="search"
            />

            <div className="space-y-3">
              {siteSections.length === 0 ? (
                <EmptyState
                  message={
                    language === "zh"
                      ? "当前客户下没有匹配的站点或项目。"
                      : "No site or project under this client matches the current search."
                  }
                />
              ) : (
                siteSections.map(({ site, siteProjects, matchingProjects, shouldExpand }) => {
                  const activeSite = detailView === "site" && selectedSite?.id === site.id;
                  const visibleProjects =
                    normalizedResourceQuery.length > 0 ? matchingProjects : siteProjects;

                  return (
                    <div
                      key={site.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-3"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSiteId(site.id);
                          setSelectedProjectId(null);
                          setExpandedSiteId((current) => (current === site.id ? null : site.id));
                          setDetailView("site");
                        }}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-[18px] px-3 py-3 text-left transition",
                          activeSite ? "bg-slate-950 text-white" : "hover:bg-slate-50",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{site.name}</p>
                          <p className={cn("mt-1 text-xs", activeSite ? "text-white/70" : "text-slate-500")}>
                            {site.address || site.timezone}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            activeSite ? "bg-white/14 text-white" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {siteProjects.length} {language === "zh" ? "项目" : "projects"}
                        </span>
                      </button>

                      {shouldExpand && visibleProjects.length > 0 ? (
                        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                          {visibleProjects.map((project) => {
                            const projectActive =
                              detailView === "project" && selectedProject?.id === project.id;

                            return (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSiteId(site.id);
                                  setSelectedProjectId(project.id);
                                  setExpandedSiteId(site.id);
                                  setDetailView("project");
                                }}
                                className={cn(
                                  "flex w-full items-start justify-between gap-3 rounded-[18px] border px-3 py-3 text-left transition",
                                  projectActive
                                    ? "border-slate-950 bg-slate-950 text-white"
                                    : "border-slate-200 bg-slate-50 hover:border-slate-300",
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{project.name}</p>
                                  <p
                                    className={cn(
                                      "mt-1 text-xs",
                                      projectActive ? "text-white/70" : "text-slate-500",
                                    )}
                                  >
                                    {getProjectContext(project.id, projects, clients, sites).siteName}
                                  </p>
                                </div>
                                <Badge
                                  tone={
                                    project.status === "active"
                                      ? "success"
                                      : project.status === "planning"
                                        ? "accent"
                                        : "neutral"
                                  }
                                  className="whitespace-nowrap"
                                >
                                  {project.status}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            message={
              language === "zh"
                ? "还没有客户，或当前搜索没有结果。"
                : "No client is available yet, or the current search has no results."
            }
          />
        )}
      </WorkspaceColumn>

      <WorkspaceColumn
        divided
        title={language === "zh" ? "详情" : "Details"}
        description={
          selectedClient
            ? language === "zh"
              ? "在这里更新当前选中的客户、站点或项目。"
              : "Update the selected client, site, or project here."
            : language === "zh"
              ? "先从左侧选择一个客户。"
              : "Select a client from the left first."
        }
      >
        {selectedClient ? (
          <div className="space-y-4">
            {detailView === "client" ? (
              <ClientNode
                key={`${selectedClient.id}-client`}
                client={selectedClient}
                clients={clients}
                sites={sites}
                companies={companies}
                projects={projects}
                shares={shares}
                language={language}
                updateClientRecord={updateClientRecord}
                createSiteRecord={createSiteRecord}
                updateSiteRecord={updateSiteRecord}
                createProjectRecord={createProjectRecord}
                updateProjectRecord={updateProjectRecord}
                onNotify={onNotify}
                embedded
                showSiteExplorer={false}
              />
            ) : null}

            {detailView === "site" ? (
              selectedSite ? (
                <SiteNode
                  key={`${selectedSite.id}-site`}
                  site={selectedSite}
                  clients={clients}
                  sites={sites}
                  companies={companies}
                  projects={projects}
                  shares={shares}
                  language={language}
                  updateSiteRecord={updateSiteRecord}
                  createProjectRecord={createProjectRecord}
                  updateProjectRecord={updateProjectRecord}
                  onNotify={onNotify}
                  embedded
                  showProjectList={false}
                  level={0}
                />
              ) : (
                <EmptyState
                  message={
                    language === "zh"
                      ? "先在中间列表中选择一个站点。"
                      : "Choose a site in the explorer column first."
                  }
                />
              )
            ) : null}

            {detailView === "project" ? (
              selectedProject ? (
                <ProjectNode
                  key={`${selectedProject.id}-project`}
                  project={selectedProject}
                  clients={clients}
                  sites={sites}
                  companies={companies}
                  shares={shares}
                  language={language}
                  updateProjectRecord={updateProjectRecord}
                  onNotify={onNotify}
                  embedded
                  level={0}
                  defaultOpen
                />
              ) : (
                <EmptyState
                  message={
                    language === "zh"
                      ? "先在中间列表中选择一个项目。"
                      : "Choose a project in the explorer column first."
                  }
                />
              )
            ) : null}
          </div>
        ) : (
          <EmptyState
            message={
              language === "zh"
                ? "先从左侧选择一个客户。"
                : "Select a client from the left first."
            }
          />
        )}
      </WorkspaceColumn>
    </WorkspaceBoard>
  );
}

function AssignmentEditor({
  assignment,
  projects,
  clients,
  sites,
  language,
  profileRole,
  updateProjectAssignment,
  onNotify,
}: {
  assignment: ProjectAssignment;
  projects: Project[];
  clients: Client[];
  sites: Site[];
  language: "en" | "zh";
  profileRole: Profile["role"];
  updateProjectAssignment: (payload: {
    id: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
    active: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
}) {
  const [startDate, setStartDate] = useState(assignment.startDate);
  const [endDate, setEndDate] = useState(assignment.endDate ?? "");
  const [notes, setNotes] = useState(assignment.notes ?? "");
  const [active, setActive] = useState(assignment.active);
  const { clientName, siteName, projectName } = getProjectContext(
    assignment.projectId,
    projects,
    clients,
    sites,
  );

  async function handleSave() {
    const result = await updateProjectAssignment({
      id: assignment.id,
      assignmentRole: profileRole,
      startDate,
      endDate,
      notes,
      active,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "项目分配已更新。"
          : "Assignment updated."
        : result.error ?? "",
    );
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{projectName}</p>
          <p className="text-sm text-slate-500">
            {assignment.active
              ? language === "zh"
                ? "当前生效"
                : "Active"
              : language === "zh"
                ? "已停用"
                : "Inactive"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {clientName} / {siteName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="signal">{getRoleLabel(profileRole, language)}</Badge>
          <Badge tone={assignment.active ? "success" : "neutral"}>
            {assignment.active ? (language === "zh" ? "生效中" : "live") : (language === "zh" ? "停用" : "off")}
          </Badge>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <LabeledSelect
          label={language === "zh" ? "状态" : "Status"}
          value={active ? "active" : "inactive"}
          onChange={(value) => setActive(value === "active")}
          options={[
            { value: "active", label: language === "zh" ? "生效中" : "Active" },
            { value: "inactive", label: language === "zh" ? "已停用" : "Inactive" },
          ]}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            {language === "zh" ? "角色来源" : "Role source"}
          </span>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {language === "zh"
              ? `继承用户全局角色：${getRoleLabel(profileRole, language)}`
              : `Inherited from the user's global role: ${getRoleLabel(profileRole, language)}`}
          </div>
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <LabeledInput
          label={language === "zh" ? "开始日期" : "Start date"}
          value={startDate}
          onChange={setStartDate}
          type="date"
        />
        <LabeledInput
          label={language === "zh" ? "结束日期" : "End date"}
          value={endDate}
          onChange={setEndDate}
          type="date"
        />
      </div>
      <div className="mt-4">
        <LabeledTextarea
          label={language === "zh" ? "备注" : "Notes"}
          value={notes}
          onChange={setNotes}
        />
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
      >
        {language === "zh" ? "保存分配" : "Save assignment"}
      </button>
    </div>
  );
}

function AccountWorkspace({
  currentUser,
  companies,
  language,
  updateCurrentUserPassword,
  sendPasswordResetEmail,
  onNotify,
}: {
  currentUser?: Profile;
  companies: Company[];
  language: "en" | "zh";
  updateCurrentUserPassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  if (!currentUser) {
    return (
      <EmptyState
        message={
          language === "zh"
            ? "当前还没有拿到登录用户资料。"
            : "The signed-in user profile is not available yet."
        }
      />
    );
  }

  const homeCompanyName =
    companies.find((company) => company.id === currentUser.homeCompanyId)?.name ??
    (language === "zh" ? "未设置" : "Not set");
  const accountUser = currentUser;

  async function handlePasswordUpdate() {
    setError("");

    if (password.length < 8) {
      setError(
        language === "zh" ? "新密码至少需要 8 位。" : "Use at least 8 characters for the new password.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        language === "zh" ? "两次输入的密码不一致。" : "The two password fields do not match.",
      );
      return;
    }

    setIsSavingPassword(true);
    const result = await updateCurrentUserPassword(password);
    setIsSavingPassword(false);

    if (!result.ok) {
      setError(
        result.error ??
          (language === "zh"
            ? "暂时无法更新密码，请稍后再试。"
            : "The password could not be updated right now. Try again in a moment."),
      );
      return;
    }

    setPassword("");
    setConfirmPassword("");
    onNotify(language === "zh" ? "密码已更新。" : "Password updated.");
  }

  async function handleSendResetEmail() {
    setError("");
    setIsSendingReset(true);
    const result = await sendPasswordResetEmail(accountUser.email);
    setIsSendingReset(false);

    if (!result.ok) {
      setError(
        result.error ??
          (language === "zh"
            ? "暂时无法发送重置邮件，请稍后再试。"
            : "The reset email could not be sent right now. Try again in a moment."),
      );
      return;
    }

    onNotify(
      language === "zh"
        ? "重置邮件已发送到你的工作邮箱。"
        : "A password reset email has been sent to your work inbox.",
    );
  }

  return (
    <WorkspaceBoard columnsClassName="xl:grid-cols-[0.9fr_1.1fr]">
      <WorkspaceColumn
        title={language === "zh" ? "我的账号" : "My account"}
        description={
          language === "zh"
            ? "确认你的登录邮箱、角色和归属公司。"
            : "Review the email, role, and home company tied to your sign-in."
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label={language === "zh" ? "姓名" : "Full name"}
              value={accountUser.fullName}
              onChange={() => undefined}
              disabled
            />
            <LabeledInput
              label={language === "zh" ? "工作邮箱" : "Work email"}
              value={accountUser.email}
              onChange={() => undefined}
              disabled
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label={language === "zh" ? "角色" : "Role"}
              value={getRoleLabel(accountUser.role, language)}
              onChange={() => undefined}
              disabled
            />
            <LabeledInput
              label={language === "zh" ? "归属公司" : "Home company"}
              value={homeCompanyName}
              onChange={() => undefined}
              disabled
            />
          </div>
          <SectionNote>
            {language === "zh"
              ? "如果姓名、角色或归属公司需要调整，请联系运营经理处理。密码可以直接在右侧更新。"
              : "If your name, role, or home company needs to change, ask an operations manager. You can update the password directly on the right."}
          </SectionNote>
        </div>
      </WorkspaceColumn>

      <WorkspaceColumn
        divided
        title={language === "zh" ? "密码与登录" : "Password & sign-in"}
        description={
          language === "zh"
            ? "你可以直接设置新密码，或把重置链接发到自己的工作邮箱。"
            : "Set a new password directly here, or send a reset link to your work inbox."
        }
      >
        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label={language === "zh" ? "新密码" : "New password"}
              value={password}
              onChange={setPassword}
              type="password"
            />
            <LabeledInput
              label={language === "zh" ? "确认新密码" : "Confirm new password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handlePasswordUpdate()}
              disabled={isSavingPassword}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSavingPassword
                ? language === "zh"
                  ? "正在更新..."
                  : "Updating..."
                : language === "zh"
                  ? "更新密码"
                  : "Update password"}
            </button>
            <button
              type="button"
              onClick={() => void handleSendResetEmail()}
              disabled={isSendingReset}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isSendingReset
                ? language === "zh"
                  ? "发送中..."
                  : "Sending..."
                : language === "zh"
                  ? "发送重置邮件"
                  : "Send reset email"}
            </button>
          </div>

          <SectionNote>
            {language === "zh"
              ? "如果你只是想换密码，直接更新就可以。如果你希望稍后在邮箱里继续操作，就发送重置邮件。"
              : "Use the direct update when you want to change the password now. Use the reset email when you prefer to continue from your inbox later."}
          </SectionNote>
        </div>
      </WorkspaceColumn>
    </WorkspaceBoard>
  );
}

function UserCard({
  profile,
  companies,
  projects,
  clients,
  sites,
  assignments,
  language,
  updateUserProfile,
  sendPasswordResetEmail,
  createProjectAssignment,
  updateProjectAssignment,
  onNotify,
  embedded = false,
  showProfile = true,
  showAssignments = true,
  showAssignmentList = true,
  selectedAssignmentId = null,
  assignmentPaneMode = "all",
}: {
  profile: Profile;
  companies: Company[];
  projects: Project[];
  clients: Client[];
  sites: Site[];
  assignments: ProjectAssignment[];
  language: "en" | "zh";
  updateUserProfile: (payload: {
    id: string;
    fullName: string;
    title: string;
    role: Profile["role"];
    homeCompanyId: string;
    phone: string;
    status: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordResetEmail?: (email: string) => Promise<{ ok: boolean; error?: string }>;
  createProjectAssignment: (payload: {
    userId: string;
    projectId: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateProjectAssignment: (payload: {
    id: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
    active: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
  embedded?: boolean;
  showProfile?: boolean;
  showAssignments?: boolean;
  showAssignmentList?: boolean;
  selectedAssignmentId?: string | null;
  assignmentPaneMode?: "all" | "create" | "selected";
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [title, setTitle] = useState(profile.title ?? "");
  const [role, setRole] = useState<Profile["role"]>(profile.role);
  const [homeCompanyId, setHomeCompanyId] = useState(profile.homeCompanyId ?? companies[0]?.id ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [status, setStatus] = useState(profile.status ?? "active");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [assignmentStartDate, setAssignmentStartDate] = useState(getLocalDateString());
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const userAssignments = assignments
    .filter((assignment) => assignment.userId === profile.id)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const visibleAssignments = showAssignmentList
    ? userAssignments
    : selectedAssignmentId
      ? userAssignments.filter((assignment) => assignment.id === selectedAssignmentId)
      : [];
  const shouldShowCreateAssignment = assignmentPaneMode !== "selected";
  const shouldShowAssignmentEditor = assignmentPaneMode !== "create";
  const projectOptions = projects.map((project) => ({
    label: getProjectContext(project.id, projects, clients, sites).optionLabel,
    value: project.id,
  }));

  async function handleSaveUser() {
    const result = await updateUserProfile({
      id: profile.id,
      fullName,
      title,
      role,
      homeCompanyId,
      phone,
      status,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "用户信息已更新。"
          : "User profile updated."
        : result.error ?? "",
    );
  }

  async function handleCreateAssignment() {
    const result = await createProjectAssignment({
      userId: profile.id,
      projectId,
      assignmentRole: role,
      startDate: assignmentStartDate,
      endDate: assignmentEndDate,
      notes: assignmentNotes,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "项目分配已创建。"
          : "Assignment created."
        : result.error ?? "",
    );

    if (result.ok) {
      setAssignmentNotes("");
      setAssignmentEndDate("");
    }
  }

  async function handleSendPasswordResetEmail() {
    if (!sendPasswordResetEmail) {
      return;
    }

    const result = await sendPasswordResetEmail(profile.email);

    onNotify(
      result.ok
        ? language === "zh"
          ? "密码重置邮件已发送。"
          : "Password reset email sent."
        : result.error ?? "",
    );
  }

  const content = (
    <div
      className={cn(
        "grid gap-5",
        showProfile && showAssignments ? "xl:grid-cols-[0.88fr_1.12fr]" : "grid-cols-1",
      )}
    >
      {showProfile ? (
        <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label={language === "zh" ? "姓名" : "Full name"}
            value={fullName}
            onChange={setFullName}
          />
          <LabeledInput
            label={language === "zh" ? "邮箱" : "Email"}
            value={profile.email}
            onChange={() => undefined}
            disabled
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label={language === "zh" ? "职称" : "Title"}
            value={title}
            onChange={setTitle}
          />
          <LabeledInput
            label={language === "zh" ? "电话" : "Phone"}
            value={phone}
            onChange={setPhone}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <LabeledSelect
            label={language === "zh" ? "角色" : "Role"}
            value={role}
            onChange={(value) => setRole(value as Profile["role"])}
            options={[
              {
                value: "operations_manager",
                label: language === "zh" ? "运营经理" : "Operations Manager",
              },
              {
                value: "service_engineer",
                label: language === "zh" ? "现场工程师" : "Service Engineer",
              },
            ]}
          />
          <LabeledSelect
            label={language === "zh" ? "归属公司" : "Home company"}
            value={homeCompanyId}
            onChange={setHomeCompanyId}
            options={companies.map((company) => ({ label: company.name, value: company.id }))}
          />
          <LabeledSelect
            label={language === "zh" ? "状态" : "Status"}
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: language === "zh" ? "启用中" : "Active" },
              { value: "inactive", label: language === "zh" ? "停用" : "Inactive" },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSaveUser()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {language === "zh" ? "保存用户" : "Save user"}
          </button>
          {sendPasswordResetEmail ? (
            <button
              type="button"
              onClick={() => void handleSendPasswordResetEmail()}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {language === "zh" ? "发送密码重置邮件" : "Send password reset email"}
            </button>
          ) : null}
        </div>
        </div>
      ) : null}

      {showAssignments ? (
        <div className="space-y-4">
          {shouldShowCreateAssignment ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">
                {language === "zh" ? "新增项目分配" : "Add project assignment"}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <LabeledSelect
                  label={language === "zh" ? "项目" : "Project"}
                  value={projectId}
                  onChange={setProjectId}
                  options={projectOptions}
                />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    {language === "zh" ? "角色来源" : "Role source"}
                  </span>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {language === "zh"
                      ? `自动继承用户全局角色：${getRoleLabel(role, language)}`
                      : `Automatically inherited from the user's global role: ${getRoleLabel(role, language)}`}
                  </div>
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <LabeledInput
                  label={language === "zh" ? "开始日期" : "Start date"}
                  value={assignmentStartDate}
                  onChange={setAssignmentStartDate}
                  type="date"
                />
                <LabeledInput
                  label={language === "zh" ? "结束日期" : "End date"}
                  value={assignmentEndDate}
                  onChange={setAssignmentEndDate}
                  type="date"
                />
              </div>
              <div className="mt-4">
                <LabeledTextarea
                  label={language === "zh" ? "备注" : "Notes"}
                  value={assignmentNotes}
                  onChange={setAssignmentNotes}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleCreateAssignment()}
                className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                {language === "zh" ? "添加分配" : "Add assignment"}
              </button>
            </div>
          ) : null}

          {shouldShowAssignmentEditor ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                {showAssignmentList
                  ? language === "zh"
                    ? "现有项目分配"
                    : "Existing assignments"
                  : language === "zh"
                    ? "选中分配"
                    : "Selected assignment"}
              </p>
              {visibleAssignments.length === 0 ? (
                <EmptyState
                  message={
                    showAssignmentList
                      ? language === "zh"
                        ? "这个用户还没有项目分配。"
                        : "This user does not have any project assignment yet."
                      : language === "zh"
                        ? "先从中间列表选择一个项目分配。"
                        : "Choose a project assignment in the middle column first."
                  }
                />
              ) : (
                visibleAssignments.map((assignment) => (
                  <AssignmentEditor
                    key={assignment.id}
                    assignment={assignment}
                    projects={projects}
                    clients={clients}
                    sites={sites}
                    language={language}
                    profileRole={role}
                    updateProjectAssignment={updateProjectAssignment}
                    onNotify={onNotify}
                  />
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <TreeShell
      title={profile.fullName}
      subtitle={profile.email}
      countLabel={`${userAssignments.length} ${language === "zh" ? "分配" : "assignments"}`}
    >
      {content}
    </TreeShell>
  );
}

function CreatePlatformUserCard({
  companies,
  projects,
  clients,
  sites,
  language,
  createPlatformUser,
  onNotify,
}: {
  companies: Company[];
  projects: Project[];
  clients: Client[];
  sites: Site[];
  language: "en" | "zh";
  createPlatformUser: (payload: {
    email: string;
    password: string;
    fullName: string;
    title: string;
    role: Profile["role"];
    homeCompanyId: string;
    phone: string;
    projectId?: string;
    assignmentRole?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<Profile["role"]>("service_engineer");
  const [homeCompanyId, setHomeCompanyId] = useState(companies[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [projectId, setProjectId] = useState("");
  const projectOptions = projects.map((project) => ({
    label: getProjectContext(project.id, projects, clients, sites).optionLabel,
    value: project.id,
  }));

  async function handleCreate() {
    const result = await createPlatformUser({
      email,
      password,
      fullName,
      title,
      role,
      homeCompanyId,
      phone,
      projectId: projectId || undefined,
    });

    onNotify(
      result.ok
        ? language === "zh"
          ? "用户账号已创建。"
          : "User account created."
        : result.error ?? "",
    );

    if (result.ok) {
      setEmail("");
      setPassword("");
      setFullName("");
      setTitle("");
      setPhone("");
      setProjectId("");
      setRole("service_engineer");
      setHomeCompanyId(companies[0]?.id ?? "");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardEyebrow>{language === "zh" ? "用户" : "Users"}</CardEyebrow>
        <CardTitle>{language === "zh" ? "新增用户账号" : "Add user account"}</CardTitle>
        <CardDescription>
          {language === "zh"
            ? "在这里创建登录账号并补齐基础资料；如果你选择项目，系统会一并创建首个项目分配。"
            : "Create the sign-in account here and fill in the basic profile. If you choose a project, the first assignment is added automatically."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label={language === "zh" ? "姓名" : "Full name"}
            value={fullName}
            onChange={setFullName}
          />
          <LabeledInput
            label={language === "zh" ? "工作邮箱" : "Work email"}
            value={email}
            onChange={setEmail}
            type="email"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput
            label={language === "zh" ? "初始密码" : "Temporary password"}
            value={password}
            onChange={setPassword}
            type="password"
          />
          <LabeledInput
            label={language === "zh" ? "职称" : "Title"}
            value={title}
            onChange={setTitle}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <LabeledSelect
            label={language === "zh" ? "角色" : "Role"}
            value={role}
            onChange={(value) => setRole(value as Profile["role"])}
            options={[
              {
                value: "service_engineer",
                label: language === "zh" ? "现场工程师" : "Service Engineer",
              },
              {
                value: "operations_manager",
                label: language === "zh" ? "运营经理" : "Operations Manager",
              },
            ]}
          />
          <LabeledSelect
            label={language === "zh" ? "归属公司" : "Home company"}
            value={homeCompanyId}
            onChange={setHomeCompanyId}
            options={companies.map((company) => ({ label: company.name, value: company.id }))}
          />
          <LabeledInput
            label={language === "zh" ? "电话" : "Phone"}
            value={phone}
            onChange={setPhone}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledSelect
            label={language === "zh" ? "初始项目分配" : "Initial project assignment"}
            value={projectId}
            onChange={setProjectId}
            options={[
              {
                value: "",
                label: language === "zh" ? "不分配项目" : "No project",
              },
              ...projectOptions,
            ]}
          />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              {language === "zh" ? "角色来源" : "Role source"}
            </span>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              {language === "zh"
                ? `项目分配会自动继承全局角色：${getRoleLabel(role, language)}`
                : `Project assignments will automatically inherit the global role: ${getRoleLabel(role, language)}`}
            </div>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          {language === "zh" ? "创建用户账号" : "Create user account"}
        </button>
      </CardContent>
    </Card>
  );
}

function UserManagementWorkspace({
  companies,
  projects,
  clients,
  sites,
  profiles,
  assignments,
  language,
  createPlatformUser,
  updateUserProfile,
  sendPasswordResetEmail,
  createProjectAssignment,
  updateProjectAssignment,
  onNotify,
}: {
  companies: Company[];
  projects: Project[];
  clients: Client[];
  sites: Site[];
  profiles: Profile[];
  assignments: ProjectAssignment[];
  language: "en" | "zh";
  createPlatformUser: (payload: {
    email: string;
    password: string;
    fullName: string;
    title: string;
    role: Profile["role"];
    homeCompanyId: string;
    phone: string;
    projectId?: string;
    assignmentRole?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateUserProfile: (payload: {
    id: string;
    fullName: string;
    title: string;
    role: Profile["role"];
    homeCompanyId: string;
    phone: string;
    status: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  createProjectAssignment: (payload: {
    userId: string;
    projectId: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateProjectAssignment: (payload: {
    id: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
    active: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNotify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<UserWorkspaceView>("profile");

  const userSummaries = useMemo(
    () =>
      profiles
        .map((profile) => {
          const companyName =
            companies.find((company) => company.id === profile.homeCompanyId)?.name ?? "--";
          const userAssignments = assignments.filter((assignment) => assignment.userId === profile.id);
          const assignmentCount = userAssignments.length;
          const searchable = `${profile.fullName} ${profile.email} ${profile.title ?? ""} ${companyName}`.toLowerCase();

          return {
            profile,
            companyName,
            assignmentCount,
            searchable,
          };
        })
        .sort((left, right) => left.profile.fullName.localeCompare(right.profile.fullName)),
    [assignments, companies, profiles],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSummaries = userSummaries.filter((summary) =>
    normalizedQuery ? summary.searchable.includes(normalizedQuery) : true,
  );
  const selectedSummary =
    filteredSummaries.find((summary) => summary.profile.id === selectedUserId) ??
    userSummaries.find((summary) => summary.profile.id === selectedUserId) ??
    filteredSummaries[0] ??
    userSummaries[0] ??
    null;
  const selectedUserAssignments = selectedSummary
    ? assignments
        .filter((assignment) => assignment.userId === selectedSummary.profile.id)
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
    : [];
  const filteredAssignments = selectedUserAssignments.filter((assignment) => {
    const optionLabel = getProjectContext(assignment.projectId, projects, clients, sites).optionLabel;
    return assignmentQuery.trim()
      ? optionLabel.toLowerCase().includes(assignmentQuery.trim().toLowerCase())
      : true;
  });
  const selectedAssignment =
    selectedUserAssignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;

  return (
    <div className="space-y-5">
      <CreatePlatformUserCard
        companies={companies}
        projects={projects}
        clients={clients}
        sites={sites}
        language={language}
        createPlatformUser={createPlatformUser}
        onNotify={onNotify}
      />

      <WorkspaceBoard columnsClassName="xl:grid-cols-[280px_300px_minmax(0,1fr)] 2xl:grid-cols-[300px_320px_minmax(0,1fr)]">
        <WorkspaceColumn
          title={language === "zh" ? "用户" : "Users"}
          description={
            language === "zh"
              ? "先找到用户，再继续查看资料或项目分配。"
              : "Find the user first, then continue with profile details or assignments."
          }
          countLabel={`${filteredSummaries.length} / ${profiles.length}`}
        >
          <div className="space-y-4">
            <LabeledInput
              label={language === "zh" ? "搜索姓名 / 邮箱 / 公司" : "Search name / email / company"}
              value={query}
              onChange={setQuery}
              type="search"
            />
            <div className="space-y-2">
              {filteredSummaries.length === 0 ? (
                <EmptyState
                  message={
                    language === "zh"
                      ? "没有匹配的用户。"
                      : "No user matches the current search."
                  }
                />
              ) : (
                filteredSummaries.map((summary) => {
                  const active = selectedSummary?.profile.id === summary.profile.id;

                  return (
                  <button
                    key={summary.profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(summary.profile.id);
                      setSelectedAssignmentId(null);
                      setDetailView("profile");
                    }}
                    className={cn(
                      "w-full rounded-[24px] border px-4 py-4 text-left transition",
                        active
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      <p className="font-semibold">{summary.profile.fullName}</p>
                      <p className={cn("mt-1 text-xs", active ? "text-white/70" : "text-slate-500")}>
                        {summary.profile.email}
                      </p>
                      <div className={cn("mt-3 flex flex-wrap gap-2 text-xs", active ? "text-white/80" : "text-slate-600")}>
                        <span>{getRoleLabel(summary.profile.role, language)}</span>
                        <span>{summary.companyName}</span>
                        <span>{summary.assignmentCount} {language === "zh" ? "分配" : "assignments"}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </WorkspaceColumn>

        <WorkspaceColumn
          divided
          title={language === "zh" ? "分配" : "Assignments"}
          description={
            selectedSummary
              ? language === "zh"
                ? "打开用户资料、新增分配，或选择一个已有分配继续处理。"
                : "Open the profile, add a new assignment, or continue with an existing assignment."
              : language === "zh"
                ? "先从左侧选择一个用户。"
                : "Choose a user from the directory on the left first."
          }
          countLabel={
            selectedSummary
              ? `${filteredAssignments.length} / ${selectedUserAssignments.length}`
              : undefined
          }
        >
          {selectedSummary ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedAssignmentId(null);
                  setDetailView("profile");
                }}
                className={cn(
                  "w-full rounded-[24px] border px-4 py-4 text-left transition",
                  detailView === "profile"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{selectedSummary.profile.fullName}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        detailView === "profile" ? "text-white/70" : "text-slate-500",
                      )}
                    >
                      {selectedSummary.profile.email}
                    </p>
                  </div>
                  <Badge tone={selectedSummary.profile.status === "active" ? "success" : "neutral"}>
                    {selectedSummary.profile.status === "active"
                      ? language === "zh"
                        ? "启用中"
                        : "Active"
                      : language === "zh"
                        ? "停用"
                        : "Inactive"}
                  </Badge>
                </div>
                <div
                  className={cn(
                    "mt-3 flex flex-wrap gap-2 text-xs",
                    detailView === "profile" ? "text-white/80" : "text-slate-600",
                  )}
                >
                  <span>{getRoleLabel(selectedSummary.profile.role, language)}</span>
                  <span>{selectedSummary.companyName}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedAssignmentId(null);
                  setDetailView("new_assignment");
                }}
                className={cn(
                  "w-full rounded-[22px] border px-4 py-3 text-left transition",
                  detailView === "new_assignment"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {language === "zh" ? "新增项目分配" : "Add assignment"}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        detailView === "new_assignment" ? "text-white/70" : "text-slate-500",
                      )}
                    >
                      {language === "zh"
                        ? "只在这里创建新的项目分配，右侧负责填写表单。"
                        : "Create new project assignments from here, then fill the form on the right."}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      detailView === "new_assignment"
                        ? "bg-white/14 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {selectedUserAssignments.length} {language === "zh" ? "分配" : "assignments"}
                  </span>
                </div>
              </button>

              <LabeledInput
                label={language === "zh" ? "搜索客户 / 站点 / 项目" : "Search client / site / project"}
                value={assignmentQuery}
                onChange={setAssignmentQuery}
                type="search"
              />
              <div className="space-y-2">
                {filteredAssignments.length === 0 ? (
                  <EmptyState
                    message={
                      language === "zh"
                        ? "这个用户当前没有匹配的项目分配。"
                        : "This user has no project assignment matching the current search."
                    }
                  />
                ) : (
                  filteredAssignments.map((assignment) => {
                    const context = getProjectContext(assignment.projectId, projects, clients, sites);
                    const active = selectedAssignment?.id === assignment.id;

                    return (
                      <button
                        key={assignment.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssignmentId(assignment.id);
                          setDetailView("assignment");
                        }}
                        className={cn(
                          "w-full rounded-[22px] border px-4 py-4 text-left transition",
                          active && detailView === "assignment"
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{context.projectName}</p>
                            <p className={cn("mt-1 text-xs", active ? "text-white/70" : "text-slate-500")}>
                              {context.clientName} / {context.siteName}
                            </p>
                          </div>
                          <Badge tone={assignment.active ? "success" : "neutral"} className="whitespace-nowrap">
                            {assignment.active
                              ? language === "zh"
                                ? "生效中"
                                : "Active"
                              : language === "zh"
                                ? "停用"
                                : "Inactive"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              message={language === "zh" ? "还没有用户数据。" : "No user data is available yet."}
            />
          )}
        </WorkspaceColumn>

        <WorkspaceColumn
          divided
          title={language === "zh" ? "详情" : "Details"}
          description={
            selectedSummary
              ? language === "zh"
                ? "在这里编辑选中的资料或项目分配。"
                : "Edit the selected profile or assignment here."
              : language === "zh"
                ? "先从左侧选择一个用户。"
                : "Choose a user from the directory on the left first."
          }
        >
          {selectedSummary ? (
            <div className="space-y-4">
              {detailView === "profile" ? (
                <UserCard
                  key={`${selectedSummary.profile.id}-profile`}
                  profile={selectedSummary.profile}
                  companies={companies}
                  projects={projects}
                  clients={clients}
                  sites={sites}
                  assignments={assignments}
                  language={language}
                  updateUserProfile={updateUserProfile}
                  sendPasswordResetEmail={sendPasswordResetEmail}
                  createProjectAssignment={createProjectAssignment}
                  updateProjectAssignment={updateProjectAssignment}
                  onNotify={onNotify}
                  embedded
                  showAssignments={false}
                />
              ) : null}

              {detailView === "new_assignment" ? (
                <UserCard
                  key={`${selectedSummary.profile.id}-new-assignment`}
                  profile={selectedSummary.profile}
                  companies={companies}
                  projects={projects}
                  clients={clients}
                  sites={sites}
                  assignments={assignments}
                  language={language}
                  updateUserProfile={updateUserProfile}
                  sendPasswordResetEmail={sendPasswordResetEmail}
                  createProjectAssignment={createProjectAssignment}
                  updateProjectAssignment={updateProjectAssignment}
                  onNotify={onNotify}
                  embedded
                  showProfile={false}
                  showAssignmentList={false}
                  assignmentPaneMode="create"
                />
              ) : null}

              {detailView === "assignment" ? (
                <UserCard
                  key={`${selectedSummary.profile.id}-assignment-${selectedAssignment?.id ?? "empty"}`}
                  profile={selectedSummary.profile}
                  companies={companies}
                  projects={projects}
                  clients={clients}
                  sites={sites}
                  assignments={assignments}
                  language={language}
                  updateUserProfile={updateUserProfile}
                  sendPasswordResetEmail={sendPasswordResetEmail}
                  createProjectAssignment={createProjectAssignment}
                  updateProjectAssignment={updateProjectAssignment}
                  onNotify={onNotify}
                  embedded
                  showProfile={false}
                  showAssignmentList={false}
                  selectedAssignmentId={selectedAssignment?.id ?? null}
                  assignmentPaneMode="selected"
                />
              ) : null}
            </div>
          ) : (
            <EmptyState
              message={language === "zh" ? "还没有用户数据。" : "No user data is available yet."}
            />
          )}
        </WorkspaceColumn>
      </WorkspaceBoard>
    </div>
  );
}

function OverviewActivityReview({
  attendanceLogs,
  dailyReports,
  profiles,
  projects,
  clients,
  sites,
  language,
}: {
  attendanceLogs: AttendanceLog[];
  dailyReports: DailyReport[];
  profiles: Profile[];
  projects: Project[];
  clients: Client[];
  sites: Site[];
  language: "en" | "zh";
}) {
  const [calendarMonth, setCalendarMonth] = useState(getMonthInputValue());
  const [selectedCalendarUserId, setSelectedCalendarUserId] = useState("");
  const [selectedCalendarProjectId, setSelectedCalendarProjectId] = useState("");
  const [historyKind, setHistoryKind] = useState<HistoryRecordKind>("all");
  const [historyProjectId, setHistoryProjectId] = useState("");
  const [historyDate, setHistoryDate] = useState(getLocalDateString());
  const today = getLocalDateString();

  const activeProfiles = useMemo(
    () =>
      profiles
        .filter((profile) => profile.status !== "inactive")
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [profiles],
  );
  const calendarUserId = selectedCalendarUserId || activeProfiles[0]?.id || "";
  const calendarProjectId = selectedCalendarProjectId || projects[0]?.id || "";
  const selectedUser = activeProfiles.find((profile) => profile.id === calendarUserId);
  const selectedProject = projects.find((project) => project.id === calendarProjectId);
  const calendarCells = useMemo(
    () => buildMonthCalendarCells(calendarMonth),
    [calendarMonth],
  );
  const userLogsByDate = useMemo(
    () =>
      new Map(
        attendanceLogs
          .filter((log) => log.userId === calendarUserId)
          .map((log) => [log.date, log]),
      ),
    [attendanceLogs, calendarUserId],
  );
  const reportsByDate = useMemo(() => {
    const grouped = new Map<string, DailyReport[]>();

    dailyReports
      .filter((report) => report.projectId === calendarProjectId)
      .forEach((report) => {
        grouped.set(report.date, [...(grouped.get(report.date) ?? []), report]);
      });

    return grouped;
  }, [calendarProjectId, dailyReports]);
  const monthDates = calendarCells.filter((date): date is string => Boolean(date));
  const monthUserLogs = monthDates.filter((date) => userLogsByDate.has(date)).length;
  const missingWeekdays = monthDates.filter(
    (date) => date <= today && isWeekdayDate(date) && !userLogsByDate.has(date),
  );
  const projectReportDays = monthDates.filter(
    (date) => (reportsByDate.get(date)?.length ?? 0) > 0,
  ).length;

  const historyAttendance = useMemo(
    () =>
      attendanceLogs
        .filter((log) => (historyProjectId ? log.projectId === historyProjectId : true))
        .filter((log) => (historyDate ? log.date === historyDate : true))
        .sort((left, right) =>
          `${left.date}-${left.clockInTime ?? ""}` < `${right.date}-${right.clockInTime ?? ""}`
            ? 1
            : -1,
        ),
    [attendanceLogs, historyDate, historyProjectId],
  );
  const historyReports = useMemo(
    () =>
      dailyReports
        .filter((report) => (historyProjectId ? report.projectId === historyProjectId : true))
        .filter((report) => (historyDate ? report.date === historyDate : true))
        .sort((left, right) =>
          `${left.date}-${left.recordNumber}` < `${right.date}-${right.recordNumber}` ? 1 : -1,
        ),
    [dailyReports, historyDate, historyProjectId],
  );
  const showAttendanceHistory = historyKind === "all" || historyKind === "attendance";
  const showReportHistory = historyKind === "all" || historyKind === "reports";
  const weekdayLabels =
    language === "zh"
      ? ["日", "一", "二", "三", "四", "五", "六"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
      <Card>
        <CardHeader>
          <CardEyebrow>
            {language === "zh" ? "日历复核" : "Calendar review"}
          </CardEyebrow>
          <CardTitle>
            {language === "zh" ? "考勤缺口与项目日报" : "Attendance gaps and project reports"}
          </CardTitle>
          <CardDescription>
            {language === "zh"
              ? "选择工程师和项目，在同一个月历里查看考勤是否缺失，以及项目哪些天已有日报。"
              : "Choose an engineer and project to review missing attendance logs and project report days in one month view."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <LabeledSelect
              label={language === "zh" ? "工程师 / 用户" : "Engineer / user"}
              value={calendarUserId}
              onChange={setSelectedCalendarUserId}
              options={activeProfiles.map((profile) => ({
                label: profile.fullName,
                value: profile.id,
              }))}
            />
            <LabeledSelect
              label={language === "zh" ? "项目日报" : "Project reports"}
              value={calendarProjectId}
              onChange={setSelectedCalendarProjectId}
              options={projects.map((project) => ({
                label: getProjectContext(project.id, projects, clients, sites).optionLabel,
                value: project.id,
              }))}
            />
            <LabeledInput
              label={language === "zh" ? "月份" : "Month"}
              value={calendarMonth}
              onChange={setCalendarMonth}
              type="month"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {language === "zh" ? "考勤记录" : "Attendance logs"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{monthUserLogs}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedUser?.fullName ?? "--"}</p>
            </div>
            <div className="rounded-[24px] border border-rose-100 bg-rose-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">
                {language === "zh" ? "缺失工作日" : "Missing weekdays"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-rose-700">
                {missingWeekdays.length}
              </p>
              <p className="mt-1 text-sm text-rose-600">
                {language === "zh" ? "截至今天无考勤记录。" : "Weekdays through today with no log."}
              </p>
            </div>
            <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-500">
                {language === "zh" ? "日报天数" : "Report days"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-blue-700">{projectReportDays}</p>
              <p className="mt-1 text-sm text-blue-600">{selectedProject?.name ?? "--"}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
              {weekdayLabels.map((label) => (
                <div key={label} className="px-2 py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[118px] border-b border-r border-slate-100 bg-slate-50/60"
                    />
                  );
                }

                const dayNumber = Number(date.slice(-2));
                const attendance = userLogsByDate.get(date);
                const reports = reportsByDate.get(date) ?? [];
                const isFuture = date > today;
                const isMissing = !isFuture && isWeekdayDate(date) && !attendance;

                return (
                  <div
                    key={date}
                    className={cn(
                      "min-h-[118px] border-b border-r border-slate-100 p-2",
                      isMissing ? "bg-rose-50/70" : "bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{dayNumber}</span>
                      {reports.length > 0 ? (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {reports.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-2">
                      {attendance ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1",
                            getAttendancePillClass(attendance.attendanceStatus),
                          )}
                        >
                          {getAttendanceLabel(attendance.attendanceStatus, language)}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1",
                            isMissing
                              ? "bg-rose-100 text-rose-700 ring-rose-200"
                              : "bg-slate-100 text-slate-500 ring-slate-200",
                          )}
                        >
                          {isFuture
                            ? language === "zh"
                              ? "未到"
                              : "Upcoming"
                            : isMissing
                              ? language === "zh"
                                ? "缺考勤"
                                : "Missing"
                              : language === "zh"
                                ? "无记录"
                                : "No log"}
                        </span>
                      )}
                      {reports.length > 0 ? (
                        <p className="text-[11px] font-medium leading-4 text-blue-700">
                          {language === "zh"
                            ? `${reports.length} 份日报`
                            : `${reports.length} report${reports.length > 1 ? "s" : ""}`}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardEyebrow>
            {language === "zh" ? "历史查询" : "History search"}
          </CardEyebrow>
          <CardTitle>
            {language === "zh" ? "按项目和日期查记录" : "Find records by project and day"}
          </CardTitle>
          <CardDescription>
            {language === "zh"
              ? "筛选某个项目和某一天，查看日报或考勤历史。"
              : "Filter to one project and day, then review attendance or report history."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <LabeledSelect
              label={language === "zh" ? "记录类型" : "Record type"}
              value={historyKind}
              onChange={(value) => setHistoryKind(value as HistoryRecordKind)}
              options={[
                { value: "all", label: language === "zh" ? "全部" : "All" },
                { value: "attendance", label: language === "zh" ? "考勤" : "Attendance" },
                { value: "reports", label: language === "zh" ? "日报" : "Reports" },
              ]}
            />
            <LabeledSelect
              label={language === "zh" ? "项目" : "Project"}
              value={historyProjectId}
              onChange={setHistoryProjectId}
              options={[
                { value: "", label: language === "zh" ? "全部项目" : "All projects" },
                ...projects.map((project) => ({
                  label: getProjectContext(project.id, projects, clients, sites).optionLabel,
                  value: project.id,
                })),
              ]}
            />
            <LabeledInput
              label={language === "zh" ? "日期" : "Date"}
              value={historyDate}
              onChange={setHistoryDate}
              type="date"
            />
          </div>

          {showAttendanceHistory ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  {language === "zh" ? "考勤记录" : "Attendance"}
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {historyAttendance.length}
                </span>
              </div>
              {historyAttendance.length === 0 ? (
                <EmptyState
                  message={
                    language === "zh"
                      ? "没有匹配的考勤记录。"
                      : "No attendance log matches the current search."
                  }
                />
              ) : (
                historyAttendance.map((log) => (
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
                        <p className="mt-1 text-sm text-slate-600">
                          {formatDisplayDate(log.date, language)} ·{" "}
                          {projects.find((project) => project.id === log.projectId)?.name ??
                            "--"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDisplayTime(log.clockInTime, language)} -{" "}
                          {formatDisplayTime(log.clockOutTime, language)}
                        </p>
                      </div>
                      <Badge
                        tone={
                          log.attendanceStatus === "present"
                            ? "success"
                            : log.attendanceStatus === "leave"
                              ? "signal"
                              : log.attendanceStatus === "partial"
                                ? "accent"
                                : "danger"
                        }
                      >
                        {getAttendanceLabel(log.attendanceStatus, language)}
                      </Badge>
                    </div>
                    {log.note ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{log.note}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : null}

          {showReportHistory ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  {language === "zh" ? "日报记录" : "Reports"}
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {historyReports.length}
                </span>
              </div>
              {historyReports.length === 0 ? (
                <EmptyState
                  message={
                    language === "zh"
                      ? "没有匹配的日报记录。"
                      : "No daily report matches the current search."
                  }
                />
              ) : (
                historyReports.map((report) => {
                  const projectName =
                    projects.find((project) => project.id === report.projectId)?.name ?? "--";
                  const authorName =
                    profiles.find((profile) => profile.id === report.authorUserId)?.fullName ??
                    report.authorUserId;
                  const photoCount = [
                    ...report.majorTaskItems,
                    ...report.blockerItems,
                    ...report.nextDayPlanItems,
                  ].reduce((total, item) => total + item.attachments.length, 0);

                  return (
                    <div
                      key={report.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            #{report.recordNumber} · {projectName}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDisplayDate(report.date, language)} · {authorName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {language === "zh" ? "条目" : "Items"}:{" "}
                            {report.majorTaskItems.length +
                              report.blockerItems.length +
                              report.nextDayPlanItems.length}{" "}
                            · {language === "zh" ? "照片" : "Photos"}: {photoCount}
                          </p>
                        </div>
                        <Badge tone={report.status === "submitted" ? "accent" : "success"}>
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    attendanceLogs,
    auditEntries,
    clients,
    companies,
    contacts,
    copy,
    currentUser,
    createClientRecord,
    createCompany,
    createPlatformUser,
    createProjectAssignment,
    createProjectRecord,
    createSiteRecord,
    dailyReports,
    incidents,
    isOperationsManager,
    language,
    leaveRequests,
    profiles,
    projectAssignments,
    projectCompanyShares,
    projects,
    sendPasswordResetEmail,
    sites,
    updateClientRecord,
    updateCompany,
    updateCurrentUserPassword,
    updateProjectAssignment,
    updateProjectRecord,
    updateSiteRecord,
    updateUserProfile,
  } = useAppState();
  const [feedback, setFeedback] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [supportEmail, setSupportEmail] = useState("");
  const [brandLine, setBrandLine] = useState("");
  const [clientName, setClientName] = useState("");
  const [externalCode, setExternalCode] = useState("");

  const todayIso = new Date().toISOString().slice(0, 10);
  const pendingLeaves = leaveRequests.filter((item) => item.status === "submitted").length;
  const openIncidents = incidents.filter((item) => item.status !== "closed").length;
  const reportsToday = dailyReports.filter((item) => item.date === todayIso).length;
  const clockedInEngineers = attendanceLogs.filter(
    (item) => item.clockInTime && !item.clockOutTime,
  ).length;
  const userCount = profiles.length;
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const sitesCount = sites.length;
  const tabs = isOperationsManager
    ? ([
        { key: "account", label: language === "zh" ? "账号" : "Account" },
        { key: "overview", label: language === "zh" ? "概览" : "Overview" },
        { key: "resources", label: language === "zh" ? "资源" : "Resources" },
        { key: "users", label: language === "zh" ? "用户" : "Users" },
        { key: "structure", label: language === "zh" ? "结构" : "Structure" },
        { key: "network", label: language === "zh" ? "项目网络" : "Network" },
        { key: "contacts", label: copy.admin.contacts },
        { key: "audit", label: copy.admin.auditTrail },
      ] as const)
    : ([{ key: "account", label: language === "zh" ? "账号" : "Account" }] as const);
  const requestedTab = searchParams.get("tab");
  const activeTab: AdminTab =
    tabs.some((tab) => tab.key === requestedTab)
      ? (requestedTab as AdminTab)
      : isOperationsManager
        ? "overview"
        : "account";
  const structureTabs = [
    { key: "organization", label: language === "zh" ? "组织层级" : "Organization" },
    { key: "delivery", label: language === "zh" ? "交付层级" : "Delivery" },
  ] as const;
  const requestedStructureView = searchParams.get("structureView");
  const activeStructureView: StructureView =
    structureTabs.some((tab) => tab.key === requestedStructureView)
      ? (requestedStructureView as StructureView)
      : "delivery";

  const recentAuditEntries = auditEntries.slice(0, 12);
  const overviewTips =
    language === "zh"
      ? [
          "先补齐客户、站点和项目，再安排用户和项目分配。",
          "用户忘记密码时，可在 Users 里发送重置邮件。",
          "共享项目和客户侧显示公司可在 Network 里统一核对。",
        ]
      : [
          "Add clients, sites, and projects before moving on to users and assignments.",
          "Use Users to send a password reset email when someone loses access.",
          "Use Network to review shared projects and the company shown to the customer.",
        ];

  const companyProjectSummaries = useMemo(
    () =>
      companies.map((company) => ({
        company,
        projects: projects.filter((project) => {
          const sharedHere = projectCompanyShares.some(
            (share) =>
              share.projectId === project.id && share.companyId === company.id && share.active,
          );

          return (
            project.managingCompanyId === company.id ||
            project.customerFacingCompanyId === company.id ||
            sharedHere
          );
        }),
      })),
    [companies, projectCompanyShares, projects],
  );

  async function handleCreateCompany() {
    const result = await createCompany({
      name: companyName,
      legalName,
      primaryColor,
      supportEmail,
      brandLine,
    });

    setFeedback(
      result.ok
        ? language === "zh"
          ? "公司已创建。"
          : "Company created."
        : result.error ?? "",
    );

    if (result.ok) {
      setCompanyName("");
      setLegalName("");
      setSupportEmail("");
      setBrandLine("");
    }
  }

  async function handleCreateClient() {
    const result = await createClientRecord({
      name: clientName,
      externalCode,
    });

    setFeedback(
      result.ok
        ? language === "zh"
          ? "客户已创建。"
          : "Client created."
        : result.error ?? "",
    );

    if (result.ok) {
      setClientName("");
      setExternalCode("");
    }
  }

  function handleTabChange(nextTab: AdminTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    if (nextTab === "structure") {
      if (!params.get("structureView")) {
        params.set("structureView", "delivery");
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleStructureViewChange(nextView: StructureView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "structure");
    params.set("structureView", nextView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6 py-2">
      <PageHeader
        eyebrow={copy.nav.admin}
        title={isOperationsManager ? copy.admin.title : language === "zh" ? "我的账号" : "My account"}
        description={
          isOperationsManager
            ? language === "zh"
              ? "在一个地方管理人员、客户、站点、项目，以及团队每天的关键记录。"
              : "Manage people, customers, sites, projects, and the daily records your team needs to review."
            : language === "zh"
              ? "查看你的账号信息，并维护登录密码。"
              : "Review your account details and keep your sign-in password up to date."
        }
        badges={
          isOperationsManager
            ? [
                { label: copy.admin.masterData, tone: "brand" },
                { label: copy.admin.auditTrail, tone: "signal" },
              ]
            : [{ label: currentUser ? copy.roles[currentUser.role] : copy.nav.admin, tone: "brand" }]
        }
      />

      {tabs.length > 1 ? (
        <TabBar
          value={activeTab}
          onChange={(value) => handleTabChange(value as AdminTab)}
          tabs={tabs as unknown as { key: string; label: string }[]}
        />
      ) : null}

      {feedback ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      {activeTab === "account" ? (
        <AccountWorkspace
          currentUser={currentUser}
          companies={companies}
          language={language}
          updateCurrentUserPassword={updateCurrentUserPassword}
          sendPasswordResetEmail={sendPasswordResetEmail}
          onNotify={setFeedback}
        />
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={copy.today.clockedInEngineers}
              value={String(clockedInEngineers)}
              detail={
                language === "zh"
                  ? "已上班打卡且尚未下班的人数。"
                  : "People who are still clocked in."
              }
              tone="brand"
            />
            <MetricCard
              label={copy.today.submittedReports}
              value={String(reportsToday)}
              detail={language === "zh" ? "今日已提交日报。" : "Reports submitted today."}
              tone="accent"
            />
            <MetricCard
              label={copy.today.openIncidents}
              value={String(openIncidents)}
              detail={language === "zh" ? "尚未关闭的异常。" : "Incidents still open."}
              tone="danger"
            />
            <MetricCard
              label={language === "zh" ? "用户" : "Users"}
              value={String(userCount)}
              detail={
                language === "zh" ? "可登录的用户数量。" : "Active user accounts."
              }
              tone="signal"
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={language === "zh" ? "进行中项目" : "Active projects"}
              value={String(activeProjects)}
              detail={
                language === "zh" ? "状态为进行中的项目数量。" : "Projects with active status."
              }
              tone="brand"
            />
            <MetricCard
              label={language === "zh" ? "站点" : "Sites"}
              value={String(sitesCount)}
              detail={language === "zh" ? "站点总数。" : "Total configured sites."}
              tone="signal"
            />
            <MetricCard
              label={copy.today.pendingLeaves}
              value={String(pendingLeaves)}
              detail={language === "zh" ? "等待处理的请假申请。" : "Leave requests still waiting."}
              tone="accent"
            />
            <MetricCard
              label={language === "zh" ? "共享项目" : "Shared projects"}
              value={String(projects.filter((project) => project.isShared).length)}
              detail={
                language === "zh" ? "被共享给其他公司的项目。" : "Projects shared with other companies."
              }
              tone="danger"
            />
          </section>

          <OverviewActivityReview
            attendanceLogs={attendanceLogs}
            dailyReports={dailyReports}
            profiles={profiles}
            projects={projects}
            clients={clients}
            sites={sites}
            language={language}
          />

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardEyebrow>{language === "zh" ? "使用建议" : "Tips"}</CardEyebrow>
                <CardTitle>{language === "zh" ? "常用操作" : "Common actions"}</CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "这些操作最常用，也最适合先处理。"
                    : "These are the actions teams use most often."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overviewTips.map((tip) => (
                  <SectionNote key={tip}>{tip}</SectionNote>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardEyebrow>{language === "zh" ? "公司覆盖" : "Company coverage"}</CardEyebrow>
                <CardTitle>{language === "zh" ? "公司与项目概览" : "Company and project snapshot"}</CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "查看每家公司关联的项目数量。"
                    : "See how many projects are linked to each company."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {companyProjectSummaries.length === 0 ? (
                  <EmptyState message={copy.common.noData} />
                ) : (
                  companyProjectSummaries.map(({ company, projects: linkedProjects }) => (
                    <div
                      key={company.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: company.primaryColor ?? "#94a3b8" }}
                          />
                          <div>
                            <p className="font-medium text-slate-900">{company.name}</p>
                            <p className="text-sm text-slate-500">{company.legalName}</p>
                          </div>
                        </div>
                        <Badge tone="brand">
                          {linkedProjects.length} {language === "zh" ? "项目" : "projects"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      ) : null}

      {activeTab === "resources" ? (
        <ResourcePlannerWorkspace onNotify={setFeedback} />
      ) : null}

      {activeTab === "users" ? (
        <UserManagementWorkspace
          companies={companies}
          projects={projects}
          clients={clients}
          sites={sites}
          profiles={profiles}
          assignments={projectAssignments}
          language={language}
          createPlatformUser={createPlatformUser}
          updateUserProfile={updateUserProfile}
          sendPasswordResetEmail={sendPasswordResetEmail}
          createProjectAssignment={createProjectAssignment}
          updateProjectAssignment={updateProjectAssignment}
          onNotify={setFeedback}
        />
      ) : null}

      {activeTab === "structure" ? (
        <Card>
          <CardHeader>
            <CardEyebrow>{language === "zh" ? "结构" : "Structure"}</CardEyebrow>
            <CardTitle>{language === "zh" ? "组织与交付" : "Organization and delivery"}</CardTitle>
            <CardDescription>
              {language === "zh"
                ? "在这里维护公司，以及客户、站点和项目。"
                : "Manage companies, plus the customers, sites, and projects your team works on."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TabBar
              value={activeStructureView}
              onChange={(value) => handleStructureViewChange(value as StructureView)}
              tabs={structureTabs as unknown as { key: string; label: string }[]}
              className="max-w-[420px]"
            />

            {activeStructureView === "organization" ? (
              <div className="space-y-5">
                <SectionNote>
                  {language === "zh"
                    ? "先补齐公司信息，再继续维护项目和品牌设置。"
                    : "Add company details first, then continue with projects and branding."}
                </SectionNote>

                <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
                  <StructurePanel
                    title={language === "zh" ? "新增公司" : "Add company"}
                    description={
                      language === "zh"
                        ? "创建公司后，就可以在项目里选择这家公司。"
                        : "Create the company here so it can be used across projects."
                    }
                  >
                    <div className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <LabeledInput
                          label={language === "zh" ? "公司名称" : "Company name"}
                          value={companyName}
                          onChange={setCompanyName}
                        />
                        <LabeledInput
                          label={language === "zh" ? "法定名称" : "Legal name"}
                          value={legalName}
                          onChange={setLegalName}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <LabeledInput
                          label={language === "zh" ? "主色" : "Primary color"}
                          value={primaryColor}
                          onChange={setPrimaryColor}
                          type="color"
                        />
                        <LabeledInput
                          label={language === "zh" ? "支持邮箱" : "Support email"}
                          value={supportEmail}
                          onChange={setSupportEmail}
                          type="email"
                        />
                      </div>
                      <LabeledInput
                        label={language === "zh" ? "品牌说明" : "Brand line"}
                        value={brandLine}
                        onChange={setBrandLine}
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateCompany()}
                        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                      >
                        {language === "zh" ? "创建公司" : "Create company"}
                      </button>
                    </div>
                  </StructurePanel>

                  <StructurePanel
                    title={language === "zh" ? "组织树" : "Organization tree"}
                    description={
                      language === "zh"
                        ? "按公司查看信息，并快速确认每家公司关联了哪些项目。"
                        : "Review each company and quickly confirm which projects are linked to it."
                    }
                    countLabel={`${companies.length} ${language === "zh" ? "家公司" : "companies"}`}
                  >
                    <div className="space-y-2">
                      {companies.length === 0 ? (
                        <EmptyState message={copy.common.noData} />
                      ) : (
                        companies.map((company) => (
                          <CompanyNode
                            key={company.id}
                            company={company}
                            projects={projects}
                            sites={sites}
                            shares={projectCompanyShares}
                            companies={companies}
                            language={language}
                            updateCompany={updateCompany}
                            onNotify={setFeedback}
                          />
                        ))
                      )}
                    </div>
                  </StructurePanel>
                </div>
              </div>
            ) : null}

            {activeStructureView === "delivery" ? (
              <div className="space-y-5">
                <SectionNote>
                  {language === "zh"
                    ? "先定位客户，再继续维护该客户下的站点和项目。这样更容易找，也更适合数据持续增加的情况。"
                    : "Find the client first, then continue with that client's sites and projects. This stays easier to search as the list grows."}
                </SectionNote>

                <StructurePanel
                  title={language === "zh" ? "新增客户" : "Add client"}
                  description={
                    language === "zh"
                      ? "先创建客户，再继续添加站点和项目。"
                      : "Create the client first, then continue with sites and projects."
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledInput
                        label={language === "zh" ? "客户名称" : "Client name"}
                        value={clientName}
                        onChange={setClientName}
                      />
                      <LabeledInput
                        label={language === "zh" ? "外部编码" : "External code"}
                        value={externalCode}
                        onChange={setExternalCode}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCreateClient()}
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                    >
                      {language === "zh" ? "创建客户" : "Create client"}
                    </button>
                  </div>
                </StructurePanel>

                <DeliveryHierarchyWorkspace
                  clients={clients}
                  sites={sites}
                  companies={companies}
                  projects={projects}
                  shares={projectCompanyShares}
                  language={language}
                  updateClientRecord={updateClientRecord}
                  createSiteRecord={createSiteRecord}
                  updateSiteRecord={updateSiteRecord}
                  createProjectRecord={createProjectRecord}
                  updateProjectRecord={updateProjectRecord}
                  onNotify={setFeedback}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "network" ? (
        <Card>
          <CardHeader>
            <CardEyebrow>{language === "zh" ? "项目网络" : "Project network"}</CardEyebrow>
            <CardTitle>{language === "zh" ? "共享关系与客户侧显示" : "Sharing and customer view"}</CardTitle>
            <CardDescription>
              {language === "zh"
                ? "这里按项目核对负责公司、共享范围，以及客户侧显示公司。"
                : "Review each project's owner, sharing scope, and the company shown to the customer."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 ? (
              <EmptyState message={copy.common.noData} />
            ) : (
              projects.map((project) => (
                <ProjectRelationshipSummary
                  key={project.id}
                  project={project}
                  companies={companies}
                  sites={sites}
                  shares={projectCompanyShares}
                  language={language}
                />
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "contacts" ? (
        <Card>
          <CardHeader>
            <CardEyebrow>{copy.admin.contacts}</CardEyebrow>
            <CardTitle>{copy.admin.contacts}</CardTitle>
            <CardDescription>
              {language === "zh"
                ? "查看当前已录入的联系人。"
                : "Review the contacts that are already recorded."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.length === 0 ? (
              <EmptyState message={copy.common.noData} />
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{contact.name}</p>
                      <p className="text-sm text-slate-600">
                        {contact.company} · {contact.title}
                      </p>
                    </div>
                    <Badge
                      tone={
                        contact.visibilityScope === "customer_facing" ? "signal" : "neutral"
                      }
                    >
                      {contact.visibilityScope}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "audit" ? (
        <Card>
          <CardHeader>
            <CardEyebrow>{copy.admin.auditTrail}</CardEyebrow>
            <CardTitle>{copy.admin.auditTrail}</CardTitle>
            <CardDescription>
              {language === "zh"
                ? "最近后台动作与数据修改记录。"
                : "Recent admin actions and data changes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAuditEntries.length === 0 ? (
              <EmptyState message={copy.common.noData} />
            ) : (
              recentAuditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{entry.action}</p>
                      <p className="text-sm text-slate-600">
                        {entry.entityType} · {entry.entityLabel}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>
                        {profiles.find((profile) => profile.id === entry.actorUserId)?.fullName ??
                          entry.actorUserId ??
                          "--"}
                      </p>
                      <p>{formatDisplayDateTime(entry.happenedAt, language)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
