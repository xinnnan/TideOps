"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createIsolatedSupabaseBrowserClient,
  getSupabaseBrowserClient,
  hasSupabaseEnv,
} from "@/lib/supabase";
import { messages, type Copy, type Language } from "@/lib/i18n";
import type {
  ActionResult,
  LeaveRequest,
  MediaListDraftItem,
  Profile,
  WorkspaceData,
} from "@/lib/types";
import {
  createEmptyWorkspace,
  mapAttendanceLog,
  mapAuditEntry,
  mapClient,
  mapCompany,
  mapContact,
  mapDailyReport,
  mapIncident,
  mapLeaveRequest,
  mapProfile,
  mapProject,
  mapProjectAssignment,
  mapProjectCompanyShare,
  mapSafetyCheckin,
  mapSite,
} from "@/lib/workspace";
import { getLocalDateString } from "@/lib/utils";

const LANGUAGE_STORAGE_KEY = "tideops-language";
const LANGUAGE_EVENT = "tideops-language-change";
const FIELD_MEDIA_BUCKET = "field-media";

interface AppContextValue extends WorkspaceData {
  copy: Copy;
  language: Language;
  isHydrated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  workspaceError?: string | null;
  sessionUserId: string | null;
  currentUser?: Profile;
  isOperationsManager: boolean;
  login: (email: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
  refreshWorkspace: () => Promise<void>;
  createCompany: (payload: {
    name: string;
    legalName: string;
    primaryColor: string;
    supportEmail: string;
    brandLine: string;
  }) => Promise<ActionResult>;
  updateCompany: (payload: {
    id: string;
    name: string;
    legalName: string;
    primaryColor: string;
    supportEmail: string;
    brandLine: string;
  }) => Promise<ActionResult>;
  createClientRecord: (payload: {
    name: string;
    externalCode: string;
  }) => Promise<ActionResult>;
  updateClientRecord: (payload: {
    id: string;
    name: string;
    externalCode: string;
  }) => Promise<ActionResult>;
  createSiteRecord: (payload: {
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }) => Promise<ActionResult>;
  updateSiteRecord: (payload: {
    id: string;
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }) => Promise<ActionResult>;
  createProjectRecord: (payload: {
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
  }) => Promise<ActionResult>;
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
  }) => Promise<ActionResult>;
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
  }) => Promise<ActionResult>;
  updateUserProfile: (payload: {
    id: string;
    fullName: string;
    title: string;
    role: Profile["role"];
    homeCompanyId: string;
    phone: string;
    status: string;
  }) => Promise<ActionResult>;
  sendPasswordResetEmail: (email: string) => Promise<ActionResult>;
  updateCurrentUserPassword: (password: string) => Promise<ActionResult>;
  createProjectAssignment: (payload: {
    userId: string;
    projectId: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
  }) => Promise<ActionResult>;
  updateProjectAssignment: (payload: {
    id: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
    active: boolean;
  }) => Promise<ActionResult>;
  clockIn: (payload: {
    projectId: string;
    note: string;
    location: string;
  }) => Promise<ActionResult>;
  clockOut: (payload: {
    note: string;
    location: string;
  }) => Promise<ActionResult>;
  submitLeave: (payload: {
    leaveType: LeaveRequest["leaveType"];
    startDate: string;
    endDate: string;
    partialDay: boolean;
    reason: string;
  }) => Promise<ActionResult>;
  reviewLeave: (
    requestId: string,
    status: Extract<LeaveRequest["status"], "approved" | "rejected">,
    comment: string,
  ) => Promise<ActionResult>;
  submitSafetyCheckin: (payload: {
    projectId: string;
    shift: string;
    facilitator: string;
    taskTypes: string[];
    hazards: string[];
    ppe: string[];
    briefingTopic: string;
    notes: string;
  }) => Promise<ActionResult>;
  submitDailyReport: (payload: {
    projectId: string;
    majorTasks: MediaListDraftItem[];
    blockers: MediaListDraftItem[];
    nextDayPlan: MediaListDraftItem[];
  }) => Promise<ActionResult>;
  submitIncident: (payload: {
    projectId: string;
    incidentType: string;
    severity: "low" | "medium" | "high";
    facts: MediaListDraftItem[];
    immediateActions: MediaListDraftItem[];
    followUps: MediaListDraftItem[];
    escalationRequired: boolean;
  }) => Promise<ActionResult>;
  toggleIncidentStatus: (incidentId: string) => Promise<ActionResult>;
}

const AppContext = createContext<AppContextValue | null>(null);

function getStoredLanguageSnapshot(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  return stored === "en" || stored === "zh" ? stored : "en";
}

function subscribeToLanguagePreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStoreChange = (event: StorageEvent | Event) => {
    if (event instanceof StorageEvent && event.key && event.key !== LANGUAGE_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };

  window.addEventListener("storage", handleStoreChange);
  window.addEventListener(LANGUAGE_EVENT, handleStoreChange);

  return () => {
    window.removeEventListener("storage", handleStoreChange);
    window.removeEventListener(LANGUAGE_EVENT, handleStoreChange);
  };
}

function persistLanguage(language: Language) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const isConfigured = hasSupabaseEnv();
  const language = useSyncExternalStore<Language>(
    subscribeToLanguagePreference,
    getStoredLanguageSnapshot,
    () => "en",
  );
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData>(createEmptyWorkspace);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [isHydrated, language]);

  function getSetupErrorMessage() {
    return language === "zh"
      ? "TideOps 还没有完成登录配置，请联系管理员。"
      : "TideOps sign-in is not ready yet. Contact your administrator.";
  }

  function getProfileSetupErrorMessage() {
    return language === "zh"
      ? "账号已经创建，但还没有完成 TideOps 资料初始化，请联系运营经理处理。"
      : "The account exists, but the TideOps profile is not ready yet. Ask an operations manager to finish setup.";
  }

  function getPhotoUploadErrorMessage() {
    return language === "zh"
      ? "照片暂时无法上传，请联系管理员检查图片功能配置。"
      : "Photos are unavailable right now. Ask an administrator to check the media setup.";
  }

  function getSignInRequiredMessage() {
    return language === "zh" ? "请先登录后再继续。" : "Sign in first, then try again.";
  }

  function getProjectRequiredMessage() {
    return language === "zh"
      ? "当前没有拿到项目和站点信息，请重新选择项目后再试。"
      : "The project and site details are unavailable right now. Choose the project again and retry.";
  }

  function getBrowserOrigin() {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    return process.env.NEXT_PUBLIC_APP_URL ?? null;
  }

  function getLoginRedirectUrl() {
    const origin = getBrowserOrigin();

    return origin ? `${origin}/login` : undefined;
  }

  function getPasswordResetRedirectUrl() {
    const origin = getBrowserOrigin();

    return origin ? `${origin}/reset-password` : undefined;
  }

  async function insertAuditLog(
    action: string,
    entityType: string,
    entityId: string,
  ) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !sessionUserId) {
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_user_id: sessionUserId,
      entity_type: entityType,
      entity_id: entityId,
      action,
    });
  }

  async function uploadFieldMedia(
    folder: string,
    files: File[],
  ): Promise<string[] | null> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return null;
    }

    const uploadedPaths: string[] = [];

    for (const file of files) {
      const extension = file.name.includes(".")
        ? file.name.split(".").pop()?.toLowerCase() ?? "jpg"
        : file.type.split("/").pop()?.toLowerCase() ?? "jpg";
      const path = `${currentUser.id}/${folder}/${getLocalDateString()}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from(FIELD_MEDIA_BUCKET)
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });

      if (error) {
        setWorkspaceError(getPhotoUploadErrorMessage());
        return null;
      }

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function uploadDraftItems(
    section: "daily-report" | "incident",
    group: string,
    items: MediaListDraftItem[],
  ) {
    const result: Array<{ text: string; attachments: string[] }> = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const text = item.text.trim();

      if (!text && item.attachments.length === 0) {
        continue;
      }

      const attachments =
        item.attachments.length > 0
          ? await uploadFieldMedia(`${section}/${group}-${index}`, item.attachments)
          : [];

      if (attachments === null) {
        return null;
      }

      result.push({
        text,
        attachments,
      });
    }

    return result;
  }

  async function loadWorkspace(userId: string) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setWorkspace(createEmptyWorkspace());
      return;
    }

    setIsLoading(true);
    setWorkspaceError(null);

    const [
      companiesResult,
      clientsResult,
      sitesResult,
      projectsResult,
      projectSharesResult,
      profilesResult,
      assignmentsResult,
      contactsResult,
      attendanceResult,
      leaveResult,
      safetyResult,
      dailyResult,
      incidentsResult,
      auditResult,
    ] = await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("sites").select("*").order("name"),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase
        .from("project_company_shares")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("project_assignments")
        .select("*")
        .order("start_date", { ascending: false }),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase
        .from("attendance_logs")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("safety_checkins")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("daily_reports")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("incidents")
        .select("*")
        .order("occurred_at", { ascending: false }),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    const firstError =
      companiesResult.error ??
      clientsResult.error ??
      sitesResult.error ??
      projectsResult.error ??
      projectSharesResult.error ??
      profilesResult.error ??
      assignmentsResult.error ??
      contactsResult.error ??
      attendanceResult.error ??
      leaveResult.error ??
      safetyResult.error ??
      dailyResult.error ??
      incidentsResult.error ??
      auditResult.error;

    if (firstError) {
      setWorkspaceError(firstError.message);
      setIsLoading(false);
      return;
    }

    const nextWorkspace: WorkspaceData = {
      companies: (companiesResult.data ?? []).map((row) =>
        mapCompany(row as Record<string, unknown>),
      ),
      clients: (clientsResult.data ?? []).map((row) =>
        mapClient(row as Record<string, unknown>),
      ),
      sites: (sitesResult.data ?? []).map((row) =>
        mapSite(row as Record<string, unknown>),
      ),
      projects: (projectsResult.data ?? []).map((row) =>
        mapProject(row as Record<string, unknown>),
      ),
      projectCompanyShares: (projectSharesResult.data ?? []).map((row) =>
        mapProjectCompanyShare(row as Record<string, unknown>),
      ),
      profiles: (profilesResult.data ?? []).map((row) =>
        mapProfile(row as Record<string, unknown>),
      ),
      projectAssignments: (assignmentsResult.data ?? []).map((row) =>
        mapProjectAssignment(row as Record<string, unknown>),
      ),
      contacts: (contactsResult.data ?? []).map((row) =>
        mapContact(row as Record<string, unknown>),
      ),
      attendanceLogs: (attendanceResult.data ?? []).map((row) =>
        mapAttendanceLog(row as Record<string, unknown>),
      ),
      leaveRequests: (leaveResult.data ?? []).map((row) =>
        mapLeaveRequest(row as Record<string, unknown>),
      ),
      safetyCheckins: (safetyResult.data ?? []).map((row) =>
        mapSafetyCheckin(row as Record<string, unknown>),
      ),
      dailyReports: (dailyResult.data ?? []).map((row) =>
        mapDailyReport(row as Record<string, unknown>),
      ),
      incidents: (incidentsResult.data ?? []).map((row) =>
        mapIncident(row as Record<string, unknown>),
      ),
      auditEntries: (auditResult.data ?? []).map((row) =>
        mapAuditEntry(row as Record<string, unknown>),
      ),
    };

    setWorkspace(nextWorkspace);

    if (!nextWorkspace.profiles.find((profile) => profile.id === userId)) {
      setWorkspaceError(getProfileSetupErrorMessage());
    }

    setIsLoading(false);
  }

  const loadWorkspaceEffect = useEffectEvent(async (userId: string) => {
    await loadWorkspace(userId);
  });

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const supabaseClient = supabase;

    let cancelled = false;

    async function initializeSession() {
      setIsLoading(true);
      const { data, error } = await supabaseClient.auth.getSession();

      if (cancelled) {
        return;
      }

      if (error) {
        setWorkspaceError(error.message);
        setIsLoading(false);
        return;
      }

      const userId = data.session?.user.id ?? null;
      setSessionUserId(userId);

      if (userId) {
        await loadWorkspaceEffect(userId);
      } else {
        setWorkspace(createEmptyWorkspace());
        setIsLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (cancelled) {
        return;
      }

      const userId = session?.user.id ?? null;
      setSessionUserId(userId);

      if (userId) {
        void loadWorkspaceEffect(userId);
      } else {
        setWorkspace(createEmptyWorkspace());
        setWorkspaceError(null);
        setIsLoading(false);
      }
    });

    void initializeSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const currentUser = workspace.profiles.find(
    (profile) => profile.id === sessionUserId,
  );
  const isOperationsManager = currentUser?.role === "operations_manager";
  const copy = messages[language];

  async function refreshWorkspace() {
    if (!sessionUserId) {
      return;
    }

    await loadWorkspace(sessionUserId);
  }

  async function replaceProjectShares(
    projectId: string,
    managingCompanyId: string,
    sharedCompanyIds: string[],
  ): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const normalizedCompanyIds = Array.from(
      new Set(
        sharedCompanyIds.filter(
          (companyId) => companyId && companyId !== managingCompanyId,
        ),
      ),
    );

    const { error: deleteError } = await supabase
      .from("project_company_shares")
      .delete()
      .eq("project_id", projectId);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    if (normalizedCompanyIds.length === 0) {
      return { ok: true };
    }

    const { error: insertError } = await supabase.from("project_company_shares").insert(
      normalizedCompanyIds.map((companyId) => ({
        project_id: projectId,
        company_id: companyId,
        active: true,
      })),
    );

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    return { ok: true };
  }

  async function waitForProfileId(email: string) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return null;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (data?.id) {
        return String(data.id);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }

    return null;
  }

  async function login(email: string, password: string): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return {
        ok: false,
        error: getSetupErrorMessage(),
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  async function sendPasswordResetEmail(email: string): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getPasswordResetRedirectUrl(),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function updateCurrentUserPassword(password: string): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (sessionUserId) {
      await insertAuditLog("Password updated", "profile", sessionUserId);
    }

    return { ok: true };
  }

  function toggleLanguage() {
    persistLanguage(language === "en" ? "zh" : "en");
  }

  function setLanguage(languageValue: Language) {
    persistLanguage(languageValue);
  }

  async function createCompany(payload: {
    name: string;
    legalName: string;
    primaryColor: string;
    supportEmail: string;
    brandLine: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: payload.name.trim(),
        legal_name: payload.legalName.trim(),
        primary_color: payload.primaryColor.trim() || null,
        support_email: payload.supportEmail.trim() || null,
        brand_line: payload.brandLine.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Company created", "company", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function updateCompany(payload: {
    id: string;
    name: string;
    legalName: string;
    primaryColor: string;
    supportEmail: string;
    brandLine: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { error } = await supabase
      .from("companies")
      .update({
        name: payload.name.trim(),
        legal_name: payload.legalName.trim(),
        primary_color: payload.primaryColor.trim() || null,
        support_email: payload.supportEmail.trim() || null,
        brand_line: payload.brandLine.trim() || null,
      })
      .eq("id", payload.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Company updated", "company", payload.id);
    await refreshWorkspace();
    return { ok: true };
  }

  async function createClientRecord(payload: {
    name: string;
    externalCode: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: payload.name.trim(),
        external_code: payload.externalCode.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Client created", "client", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function updateClientRecord(payload: {
    id: string;
    name: string;
    externalCode: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { error } = await supabase
      .from("clients")
      .update({
        name: payload.name.trim(),
        external_code: payload.externalCode.trim() || null,
      })
      .eq("id", payload.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Client updated", "client", payload.id);
    await refreshWorkspace();
    return { ok: true };
  }

  async function createSiteRecord(payload: {
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { data, error } = await supabase
      .from("sites")
      .insert({
        client_id: payload.clientId,
        name: payload.name.trim(),
        address: payload.address.trim() || null,
        timezone: payload.timezone.trim() || "America/New_York",
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Site created", "site", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function updateSiteRecord(payload: {
    id: string;
    clientId: string;
    name: string;
    address: string;
    timezone: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { error } = await supabase
      .from("sites")
      .update({
        client_id: payload.clientId,
        name: payload.name.trim(),
        address: payload.address.trim() || null,
        timezone: payload.timezone.trim() || "America/New_York",
      })
      .eq("id", payload.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Site updated", "site", payload.id);
    await refreshWorkspace();
    return { ok: true };
  }

  async function createProjectRecord(payload: {
    clientId: string;
    siteId: string;
    name: string;
    managingCompanyId: string;
    customerFacingCompanyId: string;
    shiftStartTime: string;
    shiftEndTime: string;
    sharedCompanyIds: string[];
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const sharedCompanyIds = payload.sharedCompanyIds.filter(
      (companyId) => companyId !== payload.managingCompanyId,
    );

    const { data, error } = await supabase
      .from("projects")
      .insert({
        client_id: payload.clientId,
        site_id: payload.siteId,
        name: payload.name.trim(),
        managing_company_id: payload.managingCompanyId,
        customer_facing_company_id: payload.customerFacingCompanyId,
        is_shared: sharedCompanyIds.length > 0,
        shift_start_time: payload.shiftStartTime || null,
        shift_end_time: payload.shiftEndTime || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const shareResult = await replaceProjectShares(
      String(data.id),
      payload.managingCompanyId,
      sharedCompanyIds,
    );

    if (!shareResult.ok) {
      return shareResult;
    }

    await insertAuditLog("Project created", "project", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function updateProjectRecord(payload: {
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
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const sharedCompanyIds = payload.sharedCompanyIds.filter(
      (companyId) => companyId !== payload.managingCompanyId,
    );

    const { error } = await supabase
      .from("projects")
      .update({
        client_id: payload.clientId,
        site_id: payload.siteId,
        name: payload.name.trim(),
        managing_company_id: payload.managingCompanyId,
        customer_facing_company_id: payload.customerFacingCompanyId,
        is_shared: sharedCompanyIds.length > 0,
        shift_start_time: payload.shiftStartTime || null,
        shift_end_time: payload.shiftEndTime || null,
        status: payload.status,
      })
      .eq("id", payload.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    const shareResult = await replaceProjectShares(
      payload.id,
      payload.managingCompanyId,
      sharedCompanyIds,
    );

    if (!shareResult.ok) {
      return shareResult;
    }

    await insertAuditLog("Project updated", "project", payload.id);
    await refreshWorkspace();
    return { ok: true };
  }

  async function createPlatformUser(payload: {
    email: string;
    password: string;
    fullName: string;
    title: string;
    role: Profile["role"];
    homeCompanyId: string;
    phone: string;
    projectId?: string;
    assignmentRole?: string;
  }): Promise<ActionResult> {
    const isolatedClient = createIsolatedSupabaseBrowserClient();
    const supabase = getSupabaseBrowserClient();

    if (!isolatedClient || !supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const { data, error } = await isolatedClient.auth.signUp({
      email: normalizedEmail,
      password: payload.password,
      options: {
        emailRedirectTo: getLoginRedirectUrl(),
        data: {
          full_name: payload.fullName.trim(),
          title: payload.title.trim() || null,
        },
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const profileId = data.user?.id ?? (await waitForProfileId(normalizedEmail));

    if (!profileId) {
      return {
        ok: false,
        error:
          language === "zh"
            ? "账号已创建，但还没有拿到 profile 记录，请稍后刷新后再补资料。"
            : "The auth user was created, but the profile row is not visible yet. Refresh and update the user in a moment.",
      };
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: payload.fullName.trim(),
        title: payload.title.trim() || null,
        role: payload.role,
        home_company_id: payload.homeCompanyId || null,
        phone: payload.phone.trim() || null,
        status: "active",
        email: normalizedEmail,
      })
      .eq("id", profileId);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    if (payload.projectId) {
      const assignmentResult = await createProjectAssignment({
        userId: profileId,
        projectId: payload.projectId,
        assignmentRole: payload.role,
        startDate: getLocalDateString(),
        endDate: "",
        notes: "",
      });

      if (!assignmentResult.ok) {
        return assignmentResult;
      }
    }

    await insertAuditLog("Platform user created", "profile", profileId);
    await refreshWorkspace();
    return { ok: true };
  }

  async function updateUserProfile(payload: {
    id: string;
    fullName: string;
    title: string;
    role: Profile["role"];
    homeCompanyId: string;
    phone: string;
    status: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: payload.fullName.trim(),
        title: payload.title.trim() || null,
        role: payload.role,
        home_company_id: payload.homeCompanyId || null,
        phone: payload.phone.trim() || null,
        status: payload.status.trim() || "active",
      })
      .eq("id", payload.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    const { error: assignmentRoleError } = await supabase
      .from("project_assignments")
      .update({
        assignment_role: payload.role,
      })
      .eq("user_id", payload.id);

    if (assignmentRoleError) {
      return { ok: false, error: assignmentRoleError.message };
    }

    await insertAuditLog("Platform user updated", "profile", payload.id);
    await refreshWorkspace();
    return { ok: true };
  }

  async function createProjectAssignment(payload: {
    userId: string;
    projectId: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { data, error } = await supabase
      .from("project_assignments")
      .insert({
        user_id: payload.userId,
        project_id: payload.projectId,
        assignment_role: payload.assignmentRole.trim(),
        start_date: payload.startDate,
        end_date: payload.endDate || null,
        notes: payload.notes.trim() || null,
        active: true,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Project assignment created", "project_assignment", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function updateProjectAssignment(payload: {
    id: string;
    assignmentRole: string;
    startDate: string;
    endDate: string;
    notes: string;
    active: boolean;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const { error } = await supabase
      .from("project_assignments")
      .update({
        assignment_role: payload.assignmentRole.trim(),
        start_date: payload.startDate,
        end_date: payload.endDate || null,
        notes: payload.notes.trim() || null,
        active: payload.active,
      })
      .eq("id", payload.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Project assignment updated", "project_assignment", payload.id);
    await refreshWorkspace();
    return { ok: true };
  }

  async function clockIn(payload: {
    projectId: string;
    note: string;
    location: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return { ok: false, error: getSignInRequiredMessage() };
    }

    if (!currentUser.homeCompanyId) {
      return { ok: false, error: "Assign a home company before clocking in." };
    }

    const today = getLocalDateString();
    const project = workspace.projects.find((item) => item.id === payload.projectId);

    const { error } = await supabase.from("attendance_logs").upsert(
      {
        user_id: currentUser.id,
        home_company_id: currentUser.homeCompanyId,
        project_id: payload.projectId || null,
        service_company_id: project?.customerFacingCompanyId ?? null,
        date: today,
        clock_in_time: new Date().toISOString(),
        clock_in_location: payload.location.trim() || null,
        note: payload.note.trim(),
        attendance_status: "partial",
      },
      {
        onConflict: "user_id,date",
      },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Attendance clock in", "attendance", today);
    await refreshWorkspace();
    return { ok: true };
  }

  async function clockOut(payload: {
    note: string;
    location: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return { ok: false, error: getSignInRequiredMessage() };
    }

    const today = getLocalDateString();
    const currentLog = workspace.attendanceLogs.find(
      (log) => log.userId === currentUser.id && log.date === today,
    );

    if (!currentLog) {
      return { ok: false, error: copy.attendance.notClockedIn };
    }

    const { error } = await supabase
      .from("attendance_logs")
      .update({
        clock_out_time: new Date().toISOString(),
        clock_out_location: payload.location.trim() || null,
        note: payload.note.trim() || currentLog.note,
        attendance_status: "present",
      })
      .eq("id", currentLog.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Attendance clock out", "attendance", currentLog.id);
    await refreshWorkspace();
    return { ok: true };
  }

  async function submitLeave(payload: {
    leaveType: LeaveRequest["leaveType"];
    startDate: string;
    endDate: string;
    partialDay: boolean;
    reason: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return { ok: false, error: getSignInRequiredMessage() };
    }

    if (!currentUser.homeCompanyId) {
      return { ok: false, error: "Assign a home company before submitting leave." };
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .insert({
        requester_user_id: currentUser.id,
        home_company_id: currentUser.homeCompanyId,
        leave_type: payload.leaveType,
        start_date: payload.startDate,
        end_date: payload.endDate,
        partial_day_flag: payload.partialDay,
        reason: payload.reason.trim(),
        status: "submitted",
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Leave request submitted", "leave_request", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function reviewLeave(
    requestId: string,
    status: Extract<LeaveRequest["status"], "approved" | "rejected">,
    comment: string,
  ): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return { ok: false, error: getSignInRequiredMessage() };
    }

    const target = workspace.leaveRequests.find((request) => request.id === requestId);

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        manager_comment: comment.trim() || null,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      return { ok: false, error: error.message };
    }

    if (target && status === "approved") {
      const leaveDates: string[] = [];
      const cursor = new Date(`${target.startDate}T00:00:00`);
      const end = new Date(`${target.endDate}T00:00:00`);

      while (cursor <= end) {
        leaveDates.push(getLocalDateString(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      const requester = workspace.profiles.find(
        (profile) => profile.id === target.requesterUserId,
      );

      if (requester?.homeCompanyId) {
        const { error: attendanceError } = await supabase
          .from("attendance_logs")
          .upsert(
            leaveDates.map((date) => ({
              user_id: target.requesterUserId,
              home_company_id: requester.homeCompanyId,
              date,
              note: "Approved leave",
              attendance_status: "leave",
            })),
            { onConflict: "user_id,date" },
          );

        if (attendanceError) {
          return { ok: false, error: attendanceError.message };
        }
      }
    }

    await insertAuditLog(`Leave request ${status}`, "leave_request", requestId);
    await refreshWorkspace();
    return { ok: true };
  }

  async function submitSafetyCheckin(payload: {
    projectId: string;
    shift: string;
    facilitator: string;
    taskTypes: string[];
    hazards: string[];
    ppe: string[];
    briefingTopic: string;
    notes: string;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return { ok: false, error: getSignInRequiredMessage() };
    }

    const project = workspace.projects.find((item) => item.id === payload.projectId);
    const site = project
      ? workspace.sites.find((item) => item.id === project.siteId)
      : undefined;

    if (!project || !site) {
      return { ok: false, error: getProjectRequiredMessage() };
    }

    const { data, error } = await supabase
      .from("safety_checkins")
      .insert({
        client_id: project.clientId,
        site_id: site.id,
        project_id: project.id,
        render_company_id: project.customerFacingCompanyId,
        date: getLocalDateString(),
        shift: payload.shift,
        author_user_id: currentUser.id,
        facilitator: payload.facilitator.trim() || currentUser.fullName,
        planned_start_time: project.shiftStartTime || null,
        planned_end_time: project.shiftEndTime || null,
        task_types_json: payload.taskTypes,
        hazard_flags_json: payload.hazards,
        ppe_flags_json: payload.ppe,
        briefing_topic: payload.briefingTopic.trim(),
        notes: payload.notes.trim(),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Safety check-in submitted", "safety_checkin", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function submitDailyReport(payload: {
    projectId: string;
    majorTasks: MediaListDraftItem[];
    blockers: MediaListDraftItem[];
    nextDayPlan: MediaListDraftItem[];
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return { ok: false, error: getSignInRequiredMessage() };
    }

    const project = workspace.projects.find((item) => item.id === payload.projectId);
    const site = project
      ? workspace.sites.find((item) => item.id === project.siteId)
      : undefined;
    const linkedCheckin = workspace.safetyCheckins.find(
      (item) =>
        item.authorUserId === currentUser.id &&
        item.projectId === payload.projectId &&
        item.date === getLocalDateString(),
    );

    if (!project || !site) {
      return { ok: false, error: getProjectRequiredMessage() };
    }

    const majorTaskItems = await uploadDraftItems("daily-report", "major-task", payload.majorTasks);
    const blockerItems = await uploadDraftItems("daily-report", "blocker", payload.blockers);
    const nextDayPlanItems = await uploadDraftItems(
      "daily-report",
      "next-day",
      payload.nextDayPlan,
    );

    if (!majorTaskItems || !blockerItems || !nextDayPlanItems) {
      return {
        ok: false,
        error: getPhotoUploadErrorMessage(),
      };
    }

    if (majorTaskItems.length === 0) {
      return {
        ok: false,
        error:
          language === "zh"
            ? "请至少添加一条 major task 再提交。"
            : "Add at least one major task before submitting.",
      };
    }

    if (nextDayPlanItems.length === 0) {
      return {
        ok: false,
        error:
          language === "zh"
            ? "请至少添加一条 next-day plan 再提交。"
            : "Add at least one next-day plan item before submitting.",
      };
    }
    const attachmentPaths = [
      ...majorTaskItems.flatMap((item) => item.attachments),
      ...blockerItems.flatMap((item) => item.attachments),
      ...nextDayPlanItems.flatMap((item) => item.attachments),
    ];

    const startTime = project.shiftStartTime || null;
    const endTime = project.shiftEndTime || null;
    const shift =
      linkedCheckin?.shift || (project.shiftStartTime && project.shiftEndTime ? "Day" : "Field");

    let laborHours: number | null = null;

    if (startTime && endTime) {
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      laborHours =
        Math.max(endHour * 60 + endMinute - (startHour * 60 + startMinute), 0) / 60;
    }

    const { data, error } = await supabase
      .from("daily_reports")
      .insert({
        client_id: project.clientId,
        site_id: site.id,
        project_id: project.id,
        render_company_id: project.customerFacingCompanyId,
        safety_checkin_id: linkedCheckin?.id ?? null,
        date: getLocalDateString(),
        shift,
        author_user_id: currentUser.id,
        major_tasks: majorTaskItems.map((item) => item.text).join("\n"),
        start_time: startTime,
        end_time: endTime,
        labor_hours: laborHours,
        issue_summary: blockerItems.map((item) => item.text).join("\n") || null,
        corrective_action: null,
        issue_status: blockerItems.length > 0 ? "monitoring" : "resolved",
        next_day_plan: nextDayPlanItems.map((item) => item.text).join("\n"),
        blockers: blockerItems.map((item) => item.text).join("\n") || null,
        major_tasks_items_json: majorTaskItems,
        blocker_items_json: blockerItems,
        next_day_plan_items_json: nextDayPlanItems,
        attachments_json: attachmentPaths,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Daily report submitted", "daily_report", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function submitIncident(payload: {
    projectId: string;
    incidentType: string;
    severity: "low" | "medium" | "high";
    facts: MediaListDraftItem[];
    immediateActions: MediaListDraftItem[];
    followUps: MediaListDraftItem[];
    escalationRequired: boolean;
  }): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUser) {
      return { ok: false, error: getSignInRequiredMessage() };
    }

    const project = workspace.projects.find((item) => item.id === payload.projectId);
    const site = project
      ? workspace.sites.find((item) => item.id === project.siteId)
      : undefined;

    if (!project || !site) {
      return { ok: false, error: getProjectRequiredMessage() };
    }

    const factItems = await uploadDraftItems("incident", "fact", payload.facts);
    const immediateActionItems = await uploadDraftItems(
      "incident",
      "immediate-action",
      payload.immediateActions,
    );
    const followUpItems = await uploadDraftItems("incident", "follow-up", payload.followUps);

    if (!factItems || !immediateActionItems || !followUpItems) {
      return {
        ok: false,
        error: getPhotoUploadErrorMessage(),
      };
    }

    if (factItems.length === 0) {
      return {
        ok: false,
        error:
          language === "zh"
            ? "请至少添加一条异常事实描述再提交。"
            : "Add at least one incident fact before submitting.",
      };
    }

    if (immediateActionItems.length === 0) {
      return {
        ok: false,
        error:
          language === "zh"
            ? "请至少添加一条即时动作再提交。"
            : "Add at least one immediate action before submitting.",
      };
    }
    const attachmentPaths = [
      ...factItems.flatMap((item) => item.attachments),
      ...immediateActionItems.flatMap((item) => item.attachments),
      ...followUpItems.flatMap((item) => item.attachments),
    ];

    const { data, error } = await supabase
      .from("incidents")
      .insert({
        client_id: project.clientId,
        site_id: site.id,
        project_id: project.id,
        render_company_id: project.customerFacingCompanyId,
        reporter_user_id: currentUser.id,
        occurred_at: new Date().toISOString(),
        incident_type: payload.incidentType.trim(),
        severity: payload.severity,
        description: factItems.map((item) => item.text).join("\n"),
        immediate_action: immediateActionItems.map((item) => item.text).join("\n"),
        escalation_required: payload.escalationRequired,
        corrective_action: followUpItems.map((item) => item.text).join("\n") || null,
        fact_items_json: factItems,
        immediate_action_items_json: immediateActionItems,
        follow_up_items_json: followUpItems,
        attachments_json: attachmentPaths,
        status: payload.escalationRequired ? "under_review" : "open",
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Incident submitted", "incident", String(data.id));
    await refreshWorkspace();
    return { ok: true };
  }

  async function toggleIncidentStatus(incidentId: string): Promise<ActionResult> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { ok: false, error: getSetupErrorMessage() };
    }

    const target = workspace.incidents.find((incident) => incident.id === incidentId);

    if (!target) {
      return { ok: false, error: "Incident not found." };
    }

    const nextStatus = target.status === "closed" ? "under_review" : "closed";
    const { error } = await supabase
      .from("incidents")
      .update({ status: nextStatus })
      .eq("id", incidentId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await insertAuditLog("Incident status updated", "incident", incidentId);
    await refreshWorkspace();
    return { ok: true };
  }

  const value: AppContextValue = {
    ...workspace,
    copy,
    language,
    isHydrated,
    isConfigured,
    isLoading,
    workspaceError,
    sessionUserId,
    currentUser,
    isOperationsManager,
    login,
    logout,
    sendPasswordResetEmail,
    updateCurrentUserPassword,
    toggleLanguage,
    setLanguage,
    refreshWorkspace,
    createCompany,
    updateCompany,
    createClientRecord,
    updateClientRecord,
    createSiteRecord,
    updateSiteRecord,
    createProjectRecord,
    updateProjectRecord,
    createPlatformUser,
    updateUserProfile,
    createProjectAssignment,
    updateProjectAssignment,
    clockIn,
    clockOut,
    submitLeave,
    reviewLeave,
    submitSafetyCheckin,
    submitDailyReport,
    submitIncident,
    toggleIncidentStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppState must be used inside AppProvider");
  }

  return context;
}
