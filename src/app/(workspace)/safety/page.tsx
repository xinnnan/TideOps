"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/providers/app-provider";
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
import { generateBriefingSuggestion } from "@/lib/briefing-suggestions";
import { hazardOptions, ppeOptions, safetyTaskOptions } from "@/lib/form-options";
import { formatPeriodLabel, isDateInPeriod, shiftPeriod, type SummaryScope } from "@/lib/periods";
import { formatDisplayDate } from "@/lib/utils";

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-brand text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export default function SafetyPage() {
  const {
    copy,
    currentUser,
    language,
    profiles,
    projects,
    safetyCheckins,
    submitSafetyCheckin,
  } = useAppState();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [shift, setShift] = useState("Day");
  const [facilitator, setFacilitator] = useState(currentUser?.fullName ?? "");
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [hazards, setHazards] = useState<string[]>([]);
  const [ppe, setPpe] = useState<string[]>([]);
  const [briefingTopic, setBriefingTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [summaryScope, setSummaryScope] = useState<SummaryScope>("week");
  const [summaryAnchor, setSummaryAnchor] = useState(new Date());

  const suggestedBriefing = useMemo(
    () => generateBriefingSuggestion(taskTypes, hazards, language),
    [hazards, language, taskTypes],
  );
  const summaryCheckins = safetyCheckins.filter((record) =>
    isDateInPeriod(record.date, summaryAnchor, summaryScope),
  );
  const activeProjects = new Set(summaryCheckins.map((record) => record.projectId)).size;
  const facilitators = new Set(summaryCheckins.map((record) => record.facilitator)).size;
  const hazardMentions = summaryCheckins.reduce(
    (count, record) => count + record.hazardFlags.length,
    0,
  );
  const userSummary = profiles
    .map((profile) => {
      const records = summaryCheckins.filter((record) => record.authorUserId === profile.id);
      const latest = [...records].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

      return {
        profile,
        total: records.length,
        projects: new Set(records.map((record) => record.projectId)).size,
        latestDate: latest?.date ?? "",
      };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || a.profile.fullName.localeCompare(b.profile.fullName));

  function toggleValue(list: string[], value: string, setter: (items: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function handleSubmit() {
    const result = await submitSafetyCheckin({
      projectId,
      shift,
      facilitator,
      taskTypes,
      hazards,
      ppe,
      briefingTopic,
      notes,
    });

    setFeedback(result.ok ? copy.safety.submitSuccess : result.error ?? "");

    if (result.ok) {
      setTaskTypes([]);
      setHazards([]);
      setPpe([]);
      setBriefingTopic("");
      setNotes("");
    }
  }

  return (
    <div className="space-y-6 py-2">
      <PageHeader
        eyebrow={copy.nav.safety}
        title={copy.safety.title}
        description={copy.safety.description}
        badges={[
          { label: copy.safety.newRecord, tone: "brand" },
          { label: copy.safety.recentRecords, tone: "signal" },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-slate-950 text-white">
          <CardHeader>
            <CardEyebrow className="text-white/50">{copy.safety.newRecord}</CardEyebrow>
            <CardTitle className="text-white">
              {projects.find((project) => project.id === projectId)?.name}
            </CardTitle>
            <CardDescription className="text-white/70">
              {copy.safety.description}
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
                <span className="text-sm font-medium">{copy.safety.shift}</span>
                <select
                  value={shift}
                  onChange={(event) => setShift(event.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
                >
                  <option className="text-slate-950">Day</option>
                  <option className="text-slate-950">Night</option>
                </select>
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">{copy.safety.facilitator}</span>
              <input
                value={facilitator}
                onChange={(event) => setFacilitator(event.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <div className="space-y-3">
              <p className="text-sm font-medium">{copy.safety.taskTypes}</p>
              <div className="flex flex-wrap gap-2">
                {safetyTaskOptions.map((option) => (
                  <ToggleChip
                    key={option}
                    active={taskTypes.includes(option)}
                    label={option}
                    onClick={() => toggleValue(taskTypes, option, setTaskTypes)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">{copy.safety.hazards}</p>
              <div className="flex flex-wrap gap-2">
                {hazardOptions.map((option) => (
                  <ToggleChip
                    key={option}
                    active={hazards.includes(option)}
                    label={option}
                    onClick={() => toggleValue(hazards, option, setHazards)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">{copy.safety.ppe}</p>
              <div className="flex flex-wrap gap-2">
                {ppeOptions.map((option) => (
                  <ToggleChip
                    key={option}
                    active={ppe.includes(option)}
                    label={option}
                    onClick={() => toggleValue(ppe, option, setPpe)}
                  />
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">{copy.safety.briefing}</span>
              <textarea
                rows={3}
                value={briefingTopic}
                onChange={(event) => setBriefingTopic(event.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            {suggestedBriefing ? (
              <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-400/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-emerald-100">
                      {language === "zh" ? "建议 briefing topic" : "Suggested briefing topic"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      {suggestedBriefing}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBriefingTopic(suggestedBriefing)}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    {language === "zh" ? "使用建议" : "Use suggestion"}
                  </button>
                </div>
              </div>
            ) : null}
            <label className="block space-y-2">
              <span className="text-sm font-medium">{copy.safety.notes}</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
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
            <CardEyebrow>{copy.safety.recentRecords}</CardEyebrow>
            <CardTitle>{copy.safety.recentRecords}</CardTitle>
            <CardDescription>{copy.safety.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {safetyCheckins.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {copy.common.noData}
              </div>
            ) : (
              safetyCheckins.slice(0, 6).map((record) => (
                <div
                  key={record.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {projects.find((project) => project.id === record.projectId)?.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatDisplayDate(record.date, language)} · {record.facilitator}
                      </p>
                    </div>
                    <Badge tone={record.status === "submitted" ? "accent" : "success"}>
                      {record.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{record.briefingTopic}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardEyebrow>{language === "zh" ? "周 / 月汇总" : "Weekly / monthly summary"}</CardEyebrow>
          <CardTitle>
            {language === "zh" ? "安全签到汇总" : "Safety check-in summary"}
          </CardTitle>
          <CardDescription>
            {language === "zh"
              ? "按周或按月查看签到数量、项目覆盖和人员活跃情况。"
              : "Review check-in volume, project coverage, and active users by week or month."}
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
                onClick={() => setSummaryAnchor((current) => shiftPeriod(current, summaryScope, -1))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {language === "zh" ? "上一段" : "Previous"}
              </button>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {formatPeriodLabel(summaryAnchor, summaryScope, language)}
              </span>
              <button
                type="button"
                onClick={() => setSummaryAnchor((current) => shiftPeriod(current, summaryScope, 1))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {language === "zh" ? "下一段" : "Next"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Badge tone="brand" className="justify-center rounded-[24px] px-4 py-4 text-sm normal-case tracking-normal">
              {language === "zh" ? "签到总数" : "Total check-ins"}: {summaryCheckins.length}
            </Badge>
            <Badge tone="signal" className="justify-center rounded-[24px] px-4 py-4 text-sm normal-case tracking-normal">
              {language === "zh" ? "覆盖项目" : "Projects covered"}: {activeProjects}
            </Badge>
            <Badge tone="accent" className="justify-center rounded-[24px] px-4 py-4 text-sm normal-case tracking-normal">
              {language === "zh" ? "主持 / 提交人" : "Facilitators / authors"}: {facilitators}
            </Badge>
            <Badge tone="danger" className="justify-center rounded-[24px] px-4 py-4 text-sm normal-case tracking-normal">
              {language === "zh" ? "风险提及次数" : "Hazard mentions"}: {hazardMentions}
            </Badge>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {language === "zh" ? "人员" : "User"}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {language === "zh" ? "签到数" : "Check-ins"}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {language === "zh" ? "项目数" : "Projects"}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {language === "zh" ? "最近日期" : "Latest date"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {userSummary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      {copy.common.noData}
                    </td>
                  </tr>
                ) : (
                  userSummary.map((entry) => (
                    <tr key={entry.profile.id}>
                      <td className="px-4 py-3 text-slate-700">{entry.profile.fullName}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.total}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.projects}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {entry.latestDate ? formatDisplayDate(entry.latestDate, language) : "--"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
