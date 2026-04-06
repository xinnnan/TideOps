import type { DailyReport, IncidentReport, MediaListItem } from "@/lib/types";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/utils";

type ExportLanguage = "en" | "zh";

const PAGE_MARGIN = 16;
const LINE_HEIGHT = 7;
type PdfDocument = Awaited<ReturnType<typeof createPdfDocument>>;

function getLabel(language: ExportLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

async function createPdfDocument() {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
}

function ensureSpace(doc: PdfDocument, y: number, lines = 1) {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + lines * LINE_HEIGHT <= pageHeight - PAGE_MARGIN) {
    return y;
  }

  doc.addPage();
  return PAGE_MARGIN;
}

function addWrappedText(
  doc: PdfDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let nextY = ensureSpace(doc, y, lines.length);

  lines.forEach((line, index) => {
    nextY = ensureSpace(doc, nextY, 1);
    doc.text(line, x, nextY);
    nextY += LINE_HEIGHT;
    if (index < lines.length - 1) {
      nextY = ensureSpace(doc, nextY, 1);
    }
  });

  return nextY;
}

function addMetaRow(
  doc: PdfDocument,
  label: string,
  value: string,
  y: number,
) {
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, PAGE_MARGIN, y);
  doc.setFont("helvetica", "normal");
  return addWrappedText(doc, value || "--", PAGE_MARGIN + 26, y, 165);
}

function addListSection(
  doc: PdfDocument,
  title: string,
  items: MediaListItem[],
  language: ExportLanguage,
  y: number,
) {
  const filteredItems = items.filter(
    (item) => item.text.trim().length > 0 || item.attachments.length > 0,
  );

  let nextY = ensureSpace(doc, y, 2);
  doc.setFont("helvetica", "bold");
  doc.text(title, PAGE_MARGIN, nextY);
  nextY += LINE_HEIGHT;
  doc.setFont("helvetica", "normal");

  if (filteredItems.length === 0) {
    return addWrappedText(
      doc,
      getLabel(language, "No items recorded.", "暂无条目。"),
      PAGE_MARGIN,
      nextY,
      178,
    );
  }

  filteredItems.forEach((item, index) => {
    const suffix =
      item.attachments.length > 0
        ? ` ${getLabel(
            language,
            `[${item.attachments.length} photo${item.attachments.length > 1 ? "s" : ""}]`,
            `[${item.attachments.length} 张图]`,
          )}`
        : "";

    nextY = addWrappedText(
      doc,
      `${index + 1}. ${item.text || getLabel(language, "Photo only", "仅图片")}${suffix}`,
      PAGE_MARGIN + 2,
      nextY,
      176,
    );
  });

  return nextY;
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
  const doc = await createPdfDocument();
  let y = PAGE_MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(getLabel(language, "Daily Report", "日报"), PAGE_MARGIN, y);
  y += 10;

  doc.setFontSize(10);
  y = addMetaRow(doc, getLabel(language, "Project", "项目"), projectName, y);
  y = addMetaRow(doc, getLabel(language, "Author", "提交人"), authorName, y);
  y = addMetaRow(
    doc,
    getLabel(language, "Date", "日期"),
    formatDisplayDate(report.date, language),
    y,
  );
  y = addMetaRow(doc, getLabel(language, "Shift", "班次"), report.shift || "--", y);
  y += 3;

  y = addListSection(
    doc,
    getLabel(language, "Major tasks", "今日工作"),
    report.majorTaskItems,
    language,
    y,
  );
  y += 3;
  y = addListSection(
    doc,
    getLabel(language, "Blockers / risks", "阻碍 / 风险"),
    report.blockerItems,
    language,
    y,
  );
  y += 3;
  y = addListSection(
    doc,
    getLabel(language, "Next-day plan", "明日计划"),
    report.nextDayPlanItems,
    language,
    y,
  );

  doc.save(
    `${projectName.replace(/\s+/g, "-").toLowerCase()}-daily-report-${report.date}.pdf`,
  );
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
  const doc = await createPdfDocument();
  let y = PAGE_MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(getLabel(language, "Incident Report", "异常记录"), PAGE_MARGIN, y);
  y += 10;

  doc.setFontSize(10);
  y = addMetaRow(doc, getLabel(language, "Project", "项目"), projectName, y);
  y = addMetaRow(doc, getLabel(language, "Reporter", "上报人"), reporterName, y);
  y = addMetaRow(
    doc,
    getLabel(language, "Occurred at", "发生时间"),
    formatDisplayDateTime(incident.occurredAt, language),
    y,
  );
  y = addMetaRow(doc, getLabel(language, "Type", "类型"), incident.incidentType, y);
  y = addMetaRow(
    doc,
    getLabel(language, "Severity", "严重级别"),
    incident.severity,
    y,
  );
  y = addMetaRow(
    doc,
    getLabel(language, "Status", "状态"),
    incident.status,
    y,
  );
  y += 3;

  y = addListSection(
    doc,
    getLabel(language, "What happened", "发生了什么"),
    incident.factItems,
    language,
    y,
  );
  y += 3;
  y = addListSection(
    doc,
    getLabel(language, "Immediate action", "立即措施"),
    incident.immediateActionItems,
    language,
    y,
  );
  y += 3;
  y = addListSection(
    doc,
    getLabel(language, "Follow-up / closeout", "后续跟进"),
    incident.followUpItems,
    language,
    y,
  );

  doc.save(
    `${projectName.replace(/\s+/g, "-").toLowerCase()}-incident-${incident.id.slice(0, 8)}.pdf`,
  );
}
