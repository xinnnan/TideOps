export type UserRole = "operations_manager" | "service_engineer";

export type AttendanceStatus =
  | "present"
  | "partial"
  | "missing_clock_out"
  | "missing_clock_in"
  | "leave";

export type LeaveStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled";

export type IncidentStatus = "open" | "under_review" | "closed";

export type RecordStatus =
  | "draft"
  | "submitted"
  | "completed"
  | "reviewed"
  | "archived";

export type ContactType =
  | "customer"
  | "internal"
  | "site_contact"
  | "project_contact";

export type VisibilityScope = "internal_only" | "customer_facing";

export interface MediaListItem {
  text: string;
  attachments: string[];
}

export interface MediaListDraftItem {
  id: string;
  text: string;
  existingAttachments: string[];
  attachments: File[];
}

export interface Company {
  id: string;
  name: string;
  legalName: string;
  primaryColor?: string | null;
  supportEmail?: string | null;
  brandLine?: string | null;
  emailFooter?: string | null;
  logoUrl?: string | null;
  status?: string | null;
}

export interface Client {
  id: string;
  name: string;
  externalCode?: string | null;
  status?: string | null;
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  address?: string | null;
  timezone: string;
  status?: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  siteId: string;
  name: string;
  managingCompanyId: string;
  customerFacingCompanyId: string;
  isShared: boolean;
  status: "active" | "planning" | "paused";
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
}

export interface ProjectCompanyShare {
  id: string;
  projectId: string;
  companyId: string;
  active: boolean;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  title?: string | null;
  homeCompanyId?: string | null;
  phone?: string | null;
  status?: string | null;
}

export interface ProjectAssignment {
  id: string;
  userId: string;
  projectId: string;
  assignmentRole: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  active: boolean;
}

export interface Contact {
  id: string;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  title?: string | null;
  contactType: ContactType;
  visibilityScope: VisibilityScope;
  projectId?: string | null;
  siteId?: string | null;
  createdBy: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  date: string;
  projectId?: string | null;
  note: string;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  clockInLocation?: string | null;
  clockOutLocation?: string | null;
  attendanceStatus: AttendanceStatus;
}

export interface LeaveRequest {
  id: string;
  requesterUserId: string;
  leaveType: "vacation" | "sick" | "personal" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  partialDay: boolean;
  reason: string;
  status: LeaveStatus;
  managerComment?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface SafetyCheckin {
  id: string;
  recordNumber: number;
  authorUserId: string;
  projectId: string;
  date: string;
  shift: string;
  facilitator: string;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
  taskTypes: string[];
  hazardFlags: string[];
  ppeFlags: string[];
  briefingTopic: string;
  notes: string;
  status: RecordStatus;
  submittedAt?: string | null;
  createdAt?: string | null;
}

export interface DailyReport {
  id: string;
  recordNumber: number;
  authorUserId: string;
  projectId: string;
  linkedSafetyCheckinId?: string | null;
  date: string;
  shift: string;
  startTime?: string | null;
  endTime?: string | null;
  laborHours: number;
  majorTasks: string;
  issueSummary: string;
  correctiveAction: string;
  issueStatus: "resolved" | "monitoring" | "pending" | "escalated";
  nextDayPlan: string;
  blockers: string;
  fieldCrew: string[];
  attachments: string[];
  majorTaskItems: MediaListItem[];
  blockerItems: MediaListItem[];
  nextDayPlanItems: MediaListItem[];
  closeoutChecks: string[];
  status: RecordStatus;
  submittedAt?: string | null;
  createdAt?: string | null;
}

export interface IncidentReport {
  id: string;
  recordNumber: number;
  reporterUserId: string;
  projectId: string;
  occurredAt: string;
  incidentType: string;
  severity: "low" | "medium" | "high";
  description: string;
  immediateAction: string;
  escalationRequired: boolean;
  correctiveAction: string;
  attachments: string[];
  factItems: MediaListItem[];
  immediateActionItems: MediaListItem[];
  followUpItems: MediaListItem[];
  status: IncidentStatus;
  createdAt?: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorUserId?: string | null;
  entityType: string;
  entityLabel: string;
  happenedAt: string;
}

export interface Metric {
  label: string;
  value: string;
  detail: string;
  tone?: "brand" | "signal" | "accent" | "danger";
}

export interface WorkspaceData {
  companies: Company[];
  clients: Client[];
  sites: Site[];
  projects: Project[];
  projectCompanyShares: ProjectCompanyShare[];
  profiles: Profile[];
  projectAssignments: ProjectAssignment[];
  contacts: Contact[];
  attendanceLogs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
  safetyCheckins: SafetyCheckin[];
  dailyReports: DailyReport[];
  incidents: IncidentReport[];
  auditEntries: AuditEntry[];
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}
