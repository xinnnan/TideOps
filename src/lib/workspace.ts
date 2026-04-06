import type {
  AttendanceLog,
  AuditEntry,
  Client,
  Company,
  Contact,
  DailyReport,
  MediaListItem,
  IncidentReport,
  LeaveRequest,
  Profile,
  Project,
  ProjectAssignment,
  ProjectCompanyShare,
  SafetyCheckin,
  Site,
  WorkspaceData,
} from "@/lib/types";

function parseStringArray(value: unknown) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function normalizeDateTime(value: string | null | undefined) {
  return value ?? undefined;
}

function parseMediaListItems(
  value: unknown,
  fallbackText: string | null | undefined,
  fallbackAttachments: string[] = [],
): MediaListItem[] {
  if (Array.isArray(value)) {
    const parsed = value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const row = item as Record<string, unknown>;
        return {
          text: String(row.text ?? "").trim(),
          attachments: parseStringArray(row.attachments),
        };
      })
      .filter((item): item is MediaListItem => Boolean(item))
      .filter((item) => item.text.length > 0 || item.attachments.length > 0);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  const fallbackItems = String(fallbackText ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ text: item, attachments: [] as string[] }));

  if (fallbackItems.length > 0 && fallbackAttachments.length > 0) {
    fallbackItems[0] = {
      ...fallbackItems[0],
      attachments: fallbackAttachments,
    };
  }

  if (fallbackItems.length === 0 && fallbackAttachments.length > 0) {
    return [{ text: "", attachments: fallbackAttachments }];
  }

  return fallbackItems;
}

export function createEmptyWorkspace(): WorkspaceData {
  return {
    companies: [],
    clients: [],
    sites: [],
    projects: [],
    projectCompanyShares: [],
    profiles: [],
    projectAssignments: [],
    contacts: [],
    attendanceLogs: [],
    leaveRequests: [],
    safetyCheckins: [],
    dailyReports: [],
    incidents: [],
    auditEntries: [],
  };
}

export function mapCompany(row: Record<string, unknown>): Company {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    legalName: String(row.legal_name ?? ""),
    primaryColor: (row.primary_color as string | null | undefined) ?? null,
    supportEmail: (row.support_email as string | null | undefined) ?? null,
    brandLine: (row.brand_line as string | null | undefined) ?? null,
    emailFooter: (row.email_footer as string | null | undefined) ?? null,
    logoUrl: (row.logo_url as string | null | undefined) ?? null,
    status: (row.status as string | null | undefined) ?? null,
  };
}

export function mapClient(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    externalCode: (row.external_code as string | null | undefined) ?? null,
    status: (row.status as string | null | undefined) ?? null,
  };
}

export function mapSite(row: Record<string, unknown>): Site {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    name: String(row.name ?? ""),
    address: (row.address as string | null | undefined) ?? null,
    timezone: String(row.timezone ?? "America/New_York"),
    status: (row.status as string | null | undefined) ?? null,
  };
}

export function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    siteId: String(row.site_id),
    name: String(row.name ?? ""),
    managingCompanyId: String(
      row.managing_company_id ?? row.internal_owner_company_id ?? "",
    ),
    customerFacingCompanyId: String(
      row.customer_facing_company_id ?? row.delivery_company_id ?? "",
    ),
    isShared: Boolean(row.is_shared),
    status: (row.status as Project["status"]) ?? "planning",
    shiftStartTime: (row.shift_start_time as string | null | undefined) ?? null,
    shiftEndTime: (row.shift_end_time as string | null | undefined) ?? null,
  };
}

export function mapProjectCompanyShare(
  row: Record<string, unknown>,
): ProjectCompanyShare {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    companyId: String(row.company_id),
    active: Boolean(row.active ?? true),
  };
}

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    role: (row.role as Profile["role"]) ?? "service_engineer",
    title: (row.title as string | null | undefined) ?? null,
    homeCompanyId: (row.home_company_id as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
    status: (row.status as string | null | undefined) ?? null,
  };
}

export function mapProjectAssignment(
  row: Record<string, unknown>,
): ProjectAssignment {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: String(row.project_id),
    assignmentRole: String(row.assignment_role ?? ""),
    startDate: String(row.start_date ?? ""),
    endDate: (row.end_date as string | null | undefined) ?? null,
    notes: (row.notes as string | null | undefined) ?? null,
    active: Boolean(row.active),
  };
}

export function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    company: (row.company as string | null | undefined) ?? null,
    email: String(row.email ?? ""),
    phone: (row.phone as string | null | undefined) ?? null,
    title: (row.title as string | null | undefined) ?? null,
    contactType: (row.contact_type as Contact["contactType"]) ?? "customer",
    visibilityScope:
      (row.visibility_scope as Contact["visibilityScope"]) ?? "internal_only",
    projectId: (row.project_id as string | null | undefined) ?? null,
    siteId: (row.site_id as string | null | undefined) ?? null,
    createdBy: String(row.created_by),
  };
}

export function mapAttendanceLog(row: Record<string, unknown>): AttendanceLog {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    date: String(row.date ?? ""),
    projectId: (row.project_id as string | null | undefined) ?? null,
    note: String(row.note ?? ""),
    clockInTime: normalizeDateTime(
      (row.clock_in_time as string | null | undefined) ?? null,
    ),
    clockOutTime: normalizeDateTime(
      (row.clock_out_time as string | null | undefined) ?? null,
    ),
    clockInLocation:
      (row.clock_in_location as string | null | undefined) ?? null,
    clockOutLocation:
      (row.clock_out_location as string | null | undefined) ?? null,
    attendanceStatus:
      (row.attendance_status as AttendanceLog["attendanceStatus"]) ?? "partial",
  };
}

export function mapLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    id: String(row.id),
    requesterUserId: String(row.requester_user_id),
    leaveType: (row.leave_type as LeaveRequest["leaveType"]) ?? "other",
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    partialDay: Boolean(row.partial_day_flag),
    reason: String(row.reason ?? ""),
    status: (row.status as LeaveRequest["status"]) ?? "draft",
    managerComment: (row.manager_comment as string | null | undefined) ?? null,
    reviewedBy: (row.reviewed_by as string | null | undefined) ?? null,
    reviewedAt: (row.reviewed_at as string | null | undefined) ?? null,
  };
}

export function mapSafetyCheckin(
  row: Record<string, unknown>,
): SafetyCheckin {
  return {
    id: String(row.id),
    recordNumber: Number(row.record_number ?? 0),
    authorUserId: String(row.author_user_id),
    projectId: String(row.project_id),
    date: String(row.date ?? ""),
    shift: String(row.shift ?? ""),
    facilitator: String(row.facilitator ?? ""),
    plannedStartTime:
      (row.planned_start_time as string | null | undefined) ?? null,
    plannedEndTime: (row.planned_end_time as string | null | undefined) ?? null,
    taskTypes: parseStringArray(row.task_types_json),
    hazardFlags: parseStringArray(row.hazard_flags_json),
    ppeFlags: parseStringArray(row.ppe_flags_json),
    briefingTopic: String(row.briefing_topic ?? ""),
    notes: String(row.notes ?? ""),
    status: (row.status as SafetyCheckin["status"]) ?? "draft",
    submittedAt: (row.submitted_at as string | null | undefined) ?? null,
    createdAt: (row.created_at as string | null | undefined) ?? null,
  };
}

export function mapDailyReport(row: Record<string, unknown>): DailyReport {
  const attachments = parseStringArray(row.attachments_json);
  const majorTaskItems = parseMediaListItems(
    row.major_tasks_items_json,
    (row.major_tasks as string | null | undefined) ?? null,
    attachments,
  );
  const blockerItems = parseMediaListItems(
    row.blocker_items_json,
    (row.blockers as string | null | undefined) ?? null,
  );
  const nextDayPlanItems = parseMediaListItems(
    row.next_day_plan_items_json,
    (row.next_day_plan as string | null | undefined) ?? null,
  );

  return {
    id: String(row.id),
    recordNumber: Number(row.record_number ?? 0),
    authorUserId: String(row.author_user_id),
    projectId: String(row.project_id),
    linkedSafetyCheckinId:
      (row.safety_checkin_id as string | null | undefined) ?? null,
    date: String(row.date ?? ""),
    shift: String(row.shift ?? ""),
    startTime: (row.start_time as string | null | undefined) ?? null,
    endTime: (row.end_time as string | null | undefined) ?? null,
    laborHours: Number(row.labor_hours ?? 0),
    majorTasks: String(row.major_tasks ?? ""),
    issueSummary: String(row.issue_summary ?? ""),
    correctiveAction: String(row.corrective_action ?? ""),
    issueStatus:
      (row.issue_status as DailyReport["issueStatus"]) ?? "pending",
    nextDayPlan: String(row.next_day_plan ?? ""),
    blockers: String(row.blockers ?? ""),
    fieldCrew: parseStringArray(row.field_crew_json),
    attachments,
    majorTaskItems,
    blockerItems,
    nextDayPlanItems,
    closeoutChecks: [],
    status: (row.status as DailyReport["status"]) ?? "draft",
    submittedAt: (row.submitted_at as string | null | undefined) ?? null,
    createdAt: (row.created_at as string | null | undefined) ?? null,
  };
}

export function mapIncident(row: Record<string, unknown>): IncidentReport {
  const attachments = parseStringArray(row.attachments_json);
  const factItems = parseMediaListItems(
    row.fact_items_json,
    (row.description as string | null | undefined) ?? null,
    attachments,
  );
  const immediateActionItems = parseMediaListItems(
    row.immediate_action_items_json,
    (row.immediate_action as string | null | undefined) ?? null,
  );
  const followUpItems = parseMediaListItems(
    row.follow_up_items_json,
    (row.corrective_action as string | null | undefined) ?? null,
  );

  return {
    id: String(row.id),
    recordNumber: Number(row.record_number ?? 0),
    reporterUserId: String(row.reporter_user_id),
    projectId: String(row.project_id),
    occurredAt: String(row.occurred_at ?? ""),
    incidentType: String(row.incident_type ?? ""),
    severity: (row.severity as IncidentReport["severity"]) ?? "low",
    description: String(row.description ?? ""),
    immediateAction: String(row.immediate_action ?? ""),
    escalationRequired: Boolean(row.escalation_required),
    correctiveAction: String(row.corrective_action ?? ""),
    attachments,
    factItems,
    immediateActionItems,
    followUpItems,
    status: (row.status as IncidentReport["status"]) ?? "open",
    createdAt: (row.created_at as string | null | undefined) ?? null,
  };
}

export function mapAuditEntry(row: Record<string, unknown>): AuditEntry {
  return {
    id: String(row.id),
    action: String(row.action ?? ""),
    actorUserId: (row.actor_user_id as string | null | undefined) ?? null,
    entityType: String(row.entity_type ?? ""),
    entityLabel: String(row.entity_id ?? ""),
    happenedAt: String(row.created_at ?? ""),
  };
}

export function sortByNewest<T extends { happenedAt?: string; occurredAt?: string; submittedAt?: string; date?: string }>(
  rows: T[],
) {
  return [...rows].sort((a, b) => {
    const left =
      a.happenedAt ?? a.occurredAt ?? a.submittedAt ?? a.date ?? "";
    const right =
      b.happenedAt ?? b.occurredAt ?? b.submittedAt ?? b.date ?? "";

    return left < right ? 1 : -1;
  });
}
