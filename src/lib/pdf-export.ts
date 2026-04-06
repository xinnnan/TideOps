import type {
  DailyReport,
  IncidentReport,
  MediaListItem,
  SafetyCheckin,
} from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/utils";

type ExportLanguage = "en" | "zh";
type PdfKind = "daily-report" | "incident" | "safety-checkin";
type PdfTheme = {
  accent: string;
  accentSoft: string;
  accentText: string;
  headerBg: string;
  headerText: string;
};
type ExportListItem = {
  text: string;
  attachments: string[];
};

const FIELD_MEDIA_BUCKET = "field-media";
const CANVAS_WIDTH = 1100;
const PDF_MARGIN_MM = 10;
const REPORT_THEME: PdfTheme = {
  accent: "#0f766e",
  accentSoft: "#ccfbf1",
  accentText: "#115e59",
  headerBg: "#052e2b",
  headerText: "#f0fdfa",
};
const INCIDENT_THEME: PdfTheme = {
  accent: "#b45309",
  accentSoft: "#fef3c7",
  accentText: "#92400e",
  headerBg: "#3b1d00",
  headerText: "#fffbeb",
};
const SAFETY_THEME: PdfTheme = {
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  accentText: "#1d4ed8",
  headerBg: "#0f172a",
  headerText: "#eff6ff",
};

function getLabel(language: ExportLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

function getSafeFileStem(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tideops";
}

function getDocumentKindLabel(kind: PdfKind, language: ExportLanguage) {
  switch (kind) {
    case "daily-report":
      return getLabel(language, "Daily report", "日报");
    case "incident":
      return getLabel(language, "Incident", "异常");
    case "safety-checkin":
      return getLabel(language, "Safety", "安全签到");
  }
}

function applyStyles(
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
) {
  Object.assign(element.style, styles);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles?: Partial<CSSStyleDeclaration>,
  text?: string,
) {
  const element = document.createElement(tag);

  if (styles) {
    applyStyles(element, styles);
  }

  if (typeof text === "string") {
    element.textContent = text;
  }

  return element;
}

function createChip(label: string, theme: PdfTheme) {
  return createElement(
    "span",
    {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: "999px",
      padding: "8px 14px",
      background: theme.accentSoft,
      color: theme.accentText,
      fontSize: "14px",
      fontWeight: "700",
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    },
    label,
  );
}

function createMetaBlock(label: string, value: string) {
  const wrapper = createElement("div", {
    display: "grid",
    gap: "8px",
    minWidth: "0",
  });
  wrapper.append(
    createElement(
      "div",
      {
        fontSize: "13px",
        fontWeight: "700",
        color: "#475569",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      },
      label,
    ),
    createElement(
      "div",
      {
        padding: "16px 18px",
        borderRadius: "20px",
        border: "1px solid #dbe3ef",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: "18px",
        lineHeight: "1.5",
        wordBreak: "break-word",
      },
      value || "--",
    ),
  );
  return wrapper;
}

function createSectionTitle(title: string, description: string, theme: PdfTheme) {
  const wrapper = createElement("div", {
    display: "grid",
    gap: "6px",
    marginBottom: "18px",
  });

  wrapper.append(
    createElement(
      "div",
      {
        fontSize: "24px",
        fontWeight: "800",
        color: "#0f172a",
      },
      title,
    ),
    createElement(
      "div",
      {
        height: "4px",
        width: "72px",
        borderRadius: "999px",
        background: theme.accent,
      },
    ),
    createElement(
      "div",
      {
        color: "#475569",
        fontSize: "15px",
        lineHeight: "1.6",
      },
      description,
    ),
  );

  return wrapper;
}

function createItemCard(
  item: ExportListItem,
  index: number,
  theme: PdfTheme,
  attachmentDataUrls: string[],
  language: ExportLanguage,
) {
  const card = createElement("div", {
    borderRadius: "24px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    padding: "20px 22px",
    display: "grid",
    gap: "16px",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
    breakInside: "avoid",
  });

  const header = createElement("div", {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
  });
  const number = createElement(
    "div",
    {
      width: "36px",
      height: "36px",
      flex: "0 0 36px",
      borderRadius: "999px",
      background: theme.accentSoft,
      color: theme.accentText,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      fontWeight: "800",
    },
    String(index + 1),
  );
  const body = createElement("div", {
    display: "grid",
    gap: "10px",
    minWidth: "0",
    flex: "1",
  });

  body.append(
    createElement(
      "div",
      {
        color: "#0f172a",
        fontSize: "18px",
        lineHeight: "1.7",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      },
      item.text.trim() || getLabel(language, "Photo only", "仅图片"),
    ),
  );

  if (attachmentDataUrls.length > 0) {
    const photoLabel = createElement(
      "div",
      {
        color: "#475569",
        fontSize: "13px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      },
      getLabel(language, "Photos", "照片"),
    );
    const grid = createElement("div", {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "12px",
    });

    attachmentDataUrls.forEach((source, photoIndex) => {
      const figure = createElement("figure", {
        margin: "0",
        display: "grid",
        gap: "8px",
      });
      const image = createElement("img", {
        width: "100%",
        height: "220px",
        objectFit: "cover",
        borderRadius: "18px",
        border: "1px solid #dbe3ef",
        display: "block",
        background: "#e2e8f0",
      }) as HTMLImageElement;
      image.src = source;
      image.alt = `${getLabel(language, "Attachment", "附件")} ${photoIndex + 1}`;
      const caption = createElement(
        "figcaption",
        {
          color: "#64748b",
          fontSize: "13px",
        },
        `${getLabel(language, "Photo", "照片")} ${photoIndex + 1}`,
      );
      figure.append(image, caption);
      grid.append(figure);
    });

    body.append(photoLabel, grid);
  }

  header.append(number, body);
  card.append(header);

  return card;
}

function createListSection(
  title: string,
  description: string,
  items: ExportListItem[],
  attachmentMap: Map<string, string>,
  theme: PdfTheme,
  language: ExportLanguage,
) {
  const section = createElement("section", {
    display: "grid",
    gap: "18px",
  });

  section.append(createSectionTitle(title, description, theme));

  if (items.length === 0) {
    section.append(
      createElement(
        "div",
        {
          borderRadius: "22px",
          border: "1px dashed #cbd5e1",
          background: "#f8fafc",
          color: "#64748b",
          fontSize: "16px",
          lineHeight: "1.6",
          padding: "18px 20px",
        },
        getLabel(language, "No items recorded.", "暂无条目。"),
      ),
    );
    return section;
  }

  items.forEach((item, index) => {
    const images = item.attachments
      .map((path) => attachmentMap.get(path))
      .filter((value): value is string => Boolean(value));
    section.append(createItemCard(item, index, theme, images, language));
  });

  return section;
}

function filterItems(items: MediaListItem[]) {
  return items
    .filter((item) => item.text.trim().length > 0 || item.attachments.length > 0)
    .map((item) => ({
      text: item.text,
      attachments: item.attachments.filter((path) => path.trim().length > 0),
    }));
}

function stringArrayToItems(values: string[]) {
  return values
    .filter((value) => value.trim().length > 0)
    .map((value) => ({
      text: value,
      attachments: [] as string[],
    }));
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read blob as data URL."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed."));
    reader.readAsDataURL(blob);
  });
}

async function resolveAttachmentMap(paths: string[]) {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.trim().length > 0)));
  const attachmentMap = new Map<string, string>();
  const supabase = getSupabaseBrowserClient();

  if (!supabase || uniquePaths.length === 0) {
    return attachmentMap;
  }

  await Promise.all(
    uniquePaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(FIELD_MEDIA_BUCKET)
        .download(path);

      if (error || !data) {
        return;
      }

      const dataUrl = await blobToDataUrl(data);
      attachmentMap.set(path, dataUrl);
    }),
  );

  return attachmentMap;
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(
      async (image) =>
        await new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
}

async function renderNodeToPdf(root: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await waitForImages(root);

  const canvas = await html2canvas(root, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN_MM * 2;
  const contentHeight = pageHeight - PDF_MARGIN_MM * 2;
  const pageHeightPx = Math.floor((canvas.width * contentHeight) / contentWidth);

  let pageIndex = 0;
  let offsetY = 0;

  while (offsetY < canvas.height) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const context = pageCanvas.getContext("2d");
    context?.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const imageData = pageCanvas.toDataURL("image/jpeg", 0.92);
    const renderHeight = (sliceHeight * contentWidth) / canvas.width;
    pdf.addImage(
      imageData,
      "JPEG",
      PDF_MARGIN_MM,
      PDF_MARGIN_MM,
      contentWidth,
      renderHeight,
      undefined,
      "FAST",
    );

    pageIndex += 1;
    offsetY += sliceHeight;
  }

  const totalPages = pdf.getNumberOfPages();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor("#64748b");

  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.text(
      `${page} / ${totalPages}`,
      pageWidth - PDF_MARGIN_MM,
      pageHeight - 4,
      { align: "right" },
    );
  }

  pdf.save(filename);
}

function createDocumentFrame(theme: PdfTheme) {
  const root = createElement("article", {
    width: `${CANVAS_WIDTH}px`,
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily:
      '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC","Arial Unicode MS",sans-serif',
    padding: "40px",
    boxSizing: "border-box",
    display: "grid",
    gap: "28px",
  });

  const shell = createElement("div", {
    borderRadius: "36px",
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 30px 80px rgba(15, 23, 42, 0.12)",
    border: "1px solid #dbe3ef",
  });

  const body = createElement("div", {
    padding: "32px",
    display: "grid",
    gap: "28px",
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 24%)",
  });

  shell.append(body);
  root.append(shell);

  const mount = createElement("div", {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${CANVAS_WIDTH}px`,
    pointerEvents: "none",
    zIndex: "-1",
    opacity: "1",
  });
  mount.append(root);
  document.body.append(mount);

  const header = createElement("section", {
    background: `linear-gradient(135deg, ${theme.headerBg} 0%, ${theme.accent} 100%)`,
    color: theme.headerText,
    padding: "34px 36px 30px",
    display: "grid",
    gap: "18px",
  });

  shell.prepend(header);

  return {
    mount,
    body,
    header,
  };
}

async function exportDocument({
  kind,
  language,
  title,
  eyebrow,
  description,
  metaBlocks,
  listSections,
  filename,
  theme,
}: {
  kind: PdfKind;
  language: ExportLanguage;
  title: string;
  eyebrow: string;
  description: string;
  metaBlocks: Array<{ label: string; value: string }>;
  listSections: Array<{
    title: string;
    description: string;
    items: ExportListItem[];
  }>;
  filename: string;
  theme: PdfTheme;
}) {
  const allPaths = listSections.flatMap((section) =>
    section.items.flatMap((item) => item.attachments),
  );
  const attachmentMap = await resolveAttachmentMap(allPaths);
  const { mount, body, header } = createDocumentFrame(theme);

  try {
    header.append(
      createElement(
        "div",
        {
          fontSize: "13px",
          fontWeight: "800",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: "0.76",
        },
        eyebrow,
      ),
    );

    const titleRow = createElement("div", {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "18px",
    });
    const titleBlock = createElement("div", {
      display: "grid",
      gap: "10px",
      minWidth: "0",
    });
    titleBlock.append(
      createElement(
        "h1",
        {
          margin: "0",
          fontSize: "42px",
          lineHeight: "1.1",
          fontWeight: "800",
          letterSpacing: "-0.03em",
        },
        title,
      ),
      createElement(
        "p",
        {
          margin: "0",
          maxWidth: "760px",
          fontSize: "17px",
          lineHeight: "1.7",
          color: "rgba(248, 250, 252, 0.9)",
        },
        description,
      ),
    );

    const titleChips = createElement("div", {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: "10px",
      alignSelf: "flex-start",
    });
    titleChips.append(
      createChip("TideOps", theme),
      createChip(getDocumentKindLabel(kind, language), theme),
      createChip("PDF", theme),
    );
    titleRow.append(titleBlock, titleChips);
    header.append(titleRow);

    const metaGrid = createElement("section", {
      display: "grid",
      gap: "18px",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    });

    metaBlocks.forEach((item) => metaGrid.append(createMetaBlock(item.label, item.value)));
    body.append(metaGrid);

    listSections.forEach((section) => {
      body.append(
        createListSection(
          section.title,
          section.description,
          section.items,
          attachmentMap,
          theme,
          language,
        ),
      );
    });

    await renderNodeToPdf(mount, filename);
  } finally {
    mount.remove();
  }
}

export async function exportDailyReportPdf({
  report,
  projectName,
  authorName,
  language,
}: {
  report: DailyReport;
  projectName: string;
  authorName: string;
  language: ExportLanguage;
}) {
  const majorTasks = filterItems(report.majorTaskItems);
  const blockers = filterItems(report.blockerItems);
  const nextDayPlan = filterItems(report.nextDayPlanItems);

  await exportDocument({
    kind: "daily-report",
    language,
    title: getLabel(language, "Daily Report", "日报"),
    eyebrow: getLabel(language, "Field report", "现场日报"),
    description: getLabel(
      language,
      "A clean field summary of completed work, active blockers, next-day plan, and attached site photos.",
      "围绕现场完成工作、当前阻碍、次日计划和相关照片生成的正式日报。",
    ),
    metaBlocks: [
      { label: getLabel(language, "Project", "项目"), value: projectName },
      { label: getLabel(language, "Author", "提交人"), value: authorName },
      {
        label: getLabel(language, "Date", "日期"),
        value: formatDisplayDate(report.date, language),
      },
      { label: getLabel(language, "Shift", "班次"), value: report.shift || "--" },
    ],
    listSections: [
      {
        title: getLabel(language, "Major tasks", "主要工作"),
        description: getLabel(
          language,
          "What was completed on site today.",
          "记录今天在现场完成的工作。",
        ),
        items: majorTasks,
      },
      {
        title: getLabel(language, "Blockers / risks", "阻碍 / 风险"),
        description: getLabel(
          language,
          "Open blockers, issues, or delivery risks that need follow-up.",
          "记录需要跟进的阻碍、问题或交付风险。",
        ),
        items: blockers,
      },
      {
        title: getLabel(language, "Next-day plan", "次日计划"),
        description: getLabel(
          language,
          "The next work items planned for the coming day.",
          "记录下一工作日准备继续推进的事项。",
        ),
        items: nextDayPlan,
      },
    ],
    filename: `${getSafeFileStem(projectName)}-daily-report-${report.date}.pdf`,
    theme: REPORT_THEME,
  });
}

export async function exportIncidentPdf({
  incident,
  projectName,
  reporterName,
  language,
}: {
  incident: IncidentReport;
  projectName: string;
  reporterName: string;
  language: ExportLanguage;
}) {
  const facts = filterItems(incident.factItems);
  const immediateActions = filterItems(incident.immediateActionItems);
  const followUps = filterItems(incident.followUpItems);

  await exportDocument({
    kind: "incident",
    language,
    title: getLabel(language, "Incident Record", "异常记录"),
    eyebrow: getLabel(language, "Field incident", "现场异常"),
    description: getLabel(
      language,
      "A structured incident record covering what happened, immediate action, follow-up, and supporting images.",
      "围绕事实、即时动作、后续跟进和现场照片生成的结构化异常记录。",
    ),
    metaBlocks: [
      { label: getLabel(language, "Project", "项目"), value: projectName },
      { label: getLabel(language, "Reporter", "上报人"), value: reporterName },
      {
        label: getLabel(language, "Occurred at", "发生时间"),
        value: formatDisplayDateTime(incident.occurredAt, language),
      },
      { label: getLabel(language, "Type", "类型"), value: incident.incidentType },
      {
        label: getLabel(language, "Severity", "严重级别"),
        value: incident.severity,
      },
      {
        label: getLabel(language, "Status", "状态"),
        value: incident.status,
      },
    ],
    listSections: [
      {
        title: getLabel(language, "What happened", "发生了什么"),
        description: getLabel(
          language,
          "The observed facts and sequence of the incident.",
          "记录现场观察到的事实和发生顺序。",
        ),
        items: facts,
      },
      {
        title: getLabel(language, "Immediate action", "即时动作"),
        description: getLabel(
          language,
          "Actions taken right away to control or reduce risk.",
          "记录现场立刻采取的控制或降险动作。",
        ),
        items: immediateActions,
      },
      {
        title: getLabel(language, "Follow-up / closeout", "后续跟进"),
        description: getLabel(
          language,
          "Next actions, corrective work, or closure items.",
          "记录后续整改、跟进或关闭事项。",
        ),
        items: followUps,
      },
    ],
    filename: `${getSafeFileStem(projectName)}-incident-${incident.id.slice(0, 8)}.pdf`,
    theme: INCIDENT_THEME,
  });
}

export async function exportSafetyCheckinPdf({
  checkin,
  projectName,
  authorName,
  language,
}: {
  checkin: SafetyCheckin;
  projectName: string;
  authorName: string;
  language: ExportLanguage;
}) {
  await exportDocument({
    kind: "safety-checkin",
    language,
    title: getLabel(language, "Safety Check-in", "安全签到"),
    eyebrow: getLabel(language, "Field safety", "现场安全"),
    description: getLabel(
      language,
      "A structured pre-work safety record covering the work scope, hazards, PPE checks, briefing topic, and field notes.",
      "围绕作业内容、风险、PPE 检查、briefing topic 和现场备注生成的结构化安全签到记录。",
    ),
    metaBlocks: [
      { label: getLabel(language, "Project", "项目"), value: projectName },
      { label: getLabel(language, "Submitted by", "提交人"), value: authorName },
      {
        label: getLabel(language, "Date", "日期"),
        value: formatDisplayDate(checkin.date, language),
      },
      { label: getLabel(language, "Shift", "班次"), value: checkin.shift || "--" },
      {
        label: getLabel(language, "Facilitator", "主持人"),
        value: checkin.facilitator || "--",
      },
      {
        label: getLabel(language, "Status", "状态"),
        value: checkin.status || "--",
      },
    ],
    listSections: [
      {
        title: getLabel(language, "Task types", "任务类型"),
        description: getLabel(
          language,
          "The main task categories covered by this briefing.",
          "本次安全签到覆盖的主要任务类型。",
        ),
        items: stringArrayToItems(checkin.taskTypes),
      },
      {
        title: getLabel(language, "Hazards", "风险项"),
        description: getLabel(
          language,
          "Key hazards identified before work started.",
          "开工前识别出的主要风险项。",
        ),
        items: stringArrayToItems(checkin.hazardFlags),
      },
      {
        title: getLabel(language, "PPE checks", "PPE 检查"),
        description: getLabel(
          language,
          "Protective equipment confirmed for this shift.",
          "本班次已确认的个人防护装备。",
        ),
        items: stringArrayToItems(checkin.ppeFlags),
      },
      {
        title: getLabel(language, "Briefing topic", "安全 briefing"),
        description: getLabel(
          language,
          "The key talk track used before work began.",
          "开工前沟通的重点 briefing 内容。",
        ),
        items: stringArrayToItems([checkin.briefingTopic]),
      },
      {
        title: getLabel(language, "Notes", "备注"),
        description: getLabel(
          language,
          "Additional notes captured during the safety check-in.",
          "安全签到时补充记录的现场备注。",
        ),
        items: stringArrayToItems([checkin.notes]),
      },
    ],
    filename: `${getSafeFileStem(projectName)}-safety-checkin-${checkin.date}.pdf`,
    theme: SAFETY_THEME,
  });
}
