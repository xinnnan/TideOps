import type {
  DailyReport,
  IncidentReport,
  MediaListItem,
  SafetyCheckin,
} from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/utils";

type ExportLanguage = "en" | "zh";
type PdfTheme = {
  accent: string;
  accentSoft: string;
  accentText: string;
};
type ExportListItem = {
  text: string;
  attachments: string[];
};
type AttachmentFailure = {
  path: string;
  reason: string;
};
type AttachmentResolution = {
  map: Map<string, string>;
  failed: AttachmentFailure[];
  requestedCount: number;
};
export type DailyReportPdfExportResult = {
  storedPathCount: number;
  renderedPathCount: number;
  failedPaths: AttachmentFailure[];
  usedLegacyAttachmentFallback: boolean;
};
type ExportSection = {
  title: string;
  description: string;
  items: ExportListItem[];
  layout?: "cards" | "compact";
};

const FIELD_MEDIA_BUCKET = "field-media";
const CANVAS_WIDTH = 1100;
const PDF_MARGIN_MM = 10;
const PDF_FOOTER_SPACE_MM = 8;
const PDF_BLOCK_GAP_MM = 4;
const INCIDENT_THEME: PdfTheme = {
  accent: "#b45309",
  accentSoft: "#fef3c7",
  accentText: "#92400e",
};
const SAFETY_THEME: PdfTheme = {
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  accentText: "#1d4ed8",
};

function getLabel(language: ExportLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

function getSafeFileStem(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "service-record";
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
        fontSize: "12px",
        fontWeight: "700",
        color: "#475569",
        letterSpacing: "0.02em",
      },
      label,
    ),
    createElement(
      "div",
      {
        padding: "15px 18px",
        borderRadius: "18px",
        border: "1px solid #dbe3ef",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: "17px",
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
  });

  wrapper.append(
    createElement(
      "div",
      {
        fontSize: "22px",
        fontWeight: "800",
        color: "#0f172a",
      },
      title,
    ),
    createElement(
      "div",
      {
        height: "3px",
        width: "56px",
        borderRadius: "999px",
        background: theme.accent,
      },
    ),
    createElement(
      "div",
      {
        color: "#475569",
        fontSize: "14px",
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
    borderRadius: "22px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    padding: "18px 20px",
    display: "grid",
    gap: "14px",
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
      width: "34px",
      height: "34px",
      flex: "0 0 34px",
      borderRadius: "999px",
      background: theme.accentSoft,
      color: theme.accentText,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "15px",
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
        fontSize: "16px",
        lineHeight: "1.65",
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
        alignContent: "start",
      });
      const image = createElement("img", {
        width: "auto",
        maxWidth: "100%",
        height: "auto",
        maxHeight: "320px",
        objectFit: "contain",
        borderRadius: "16px",
        border: "1px solid #dbe3ef",
        display: "block",
        background: "#e2e8f0",
        justifySelf: "start",
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

function createEmptyStateBlock(language: ExportLanguage) {
  return createElement(
    "div",
    {
      borderRadius: "20px",
      border: "1px dashed #cbd5e1",
      background: "#ffffff",
      color: "#64748b",
      fontSize: "15px",
      lineHeight: "1.6",
      padding: "16px 18px",
    },
    getLabel(language, "No items recorded.", "暂无条目。"),
  );
}

function createCompactListBlock(
  items: ExportListItem[],
  theme: PdfTheme,
  language: ExportLanguage,
) {
  if (items.length === 0) {
    return createEmptyStateBlock(language);
  }

  const block = createElement("div", {
    borderRadius: "22px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    padding: "18px 20px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  });

  items.forEach((item, index) => {
    block.append(
      createElement("div", {
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        borderRadius: "999px",
        padding: "10px 14px",
        border: `1px solid ${theme.accentSoft}`,
        background: theme.accentSoft,
        color: "#0f172a",
        fontSize: "14px",
        lineHeight: "1.4",
        maxWidth: "100%",
      }),
    );

    const last = block.lastElementChild as HTMLDivElement | null;

    if (!last) {
      return;
    }

    last.append(
      createElement(
        "span",
        {
          minWidth: "0",
          color: theme.accentText,
          fontWeight: "700",
          wordBreak: "break-word",
        },
        item.text.trim() || getLabel(language, `Item ${index + 1}`, `条目 ${index + 1}`),
      ),
    );
  });

  return block;
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

async function resolveAttachmentMap(paths: string[]): Promise<AttachmentResolution> {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.trim().length > 0)));
  const attachmentMap = new Map<string, string>();
  const failed: AttachmentFailure[] = [];
  const supabase = getSupabaseBrowserClient();

  if (!supabase || uniquePaths.length === 0) {
    return {
      map: attachmentMap,
      failed: supabase
        ? []
        : uniquePaths.map((path) => ({
            path,
            reason: "Supabase client is not configured.",
          })),
      requestedCount: uniquePaths.length,
    };
  }

  await Promise.all(
    uniquePaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(FIELD_MEDIA_BUCKET)
        .download(path);

      if (error || !data) {
        failed.push({
          path,
          reason: error?.message ?? "Storage object could not be downloaded.",
        });
        return;
      }

      try {
        const dataUrl = await blobToDataUrl(data);
        attachmentMap.set(path, dataUrl);
      } catch (error) {
        failed.push({
          path,
          reason:
            error instanceof Error
              ? error.message
              : "Storage object could not be converted for PDF rendering.",
        });
      }
    }),
  );

  return {
    map: attachmentMap,
    failed,
    requestedCount: uniquePaths.length,
  };
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

async function renderElementToCanvas(
  root: HTMLElement,
  html2canvas: typeof import("html2canvas").default,
) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await waitForImages(root);

  return await html2canvas(root, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });
}

function createDocumentMount() {
  const mount = createElement("div", {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${CANVAS_WIDTH}px`,
    background: "#ffffff",
    pointerEvents: "none",
    zIndex: "-1",
  });

  const body = createElement("article", {
    width: `${CANVAS_WIDTH}px`,
    background: "#ffffff",
    color: "#0f172a",
    fontFamily:
      '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC","Arial Unicode MS",sans-serif',
    boxSizing: "border-box",
    display: "grid",
    gap: "18px",
  });

  mount.append(body);
  document.body.append(mount);

  return {
    mount,
    body,
  };
}

function createHeaderBlock({
  eyebrow,
  title,
  description,
  theme,
}: {
  eyebrow: string;
  title: string;
  description: string;
  theme: PdfTheme;
}) {
  const block = createElement("section", {
    borderRadius: "28px",
    border: "1px solid #dbe3ef",
    borderTop: `10px solid ${theme.accent}`,
    background: "#ffffff",
    padding: "28px 30px 26px",
    display: "grid",
    gap: "12px",
  });

  block.append(
    createElement(
      "div",
      {
        fontSize: "12px",
        fontWeight: "800",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: theme.accentText,
      },
      eyebrow,
    ),
    createElement(
      "h1",
      {
        margin: "0",
        fontSize: "38px",
        lineHeight: "1.1",
        fontWeight: "800",
        letterSpacing: "-0.03em",
        color: "#0f172a",
      },
      title,
    ),
    createElement(
      "p",
      {
        margin: "0",
        fontSize: "16px",
        lineHeight: "1.7",
        color: "#475569",
        maxWidth: "820px",
      },
      description,
    ),
  );

  return block;
}

function createMetaGridBlock(
  metaBlocks: Array<{ label: string; value: string }>,
) {
  const wrapper = createElement("section", {
    display: "grid",
    gap: "18px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    borderRadius: "28px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    padding: "24px",
  });

  metaBlocks.forEach((item) => wrapper.append(createMetaBlock(item.label, item.value)));

  return wrapper;
}

function addCanvasToPdf(
  pdf: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  cursor: { y: number },
  gapAfterMm: number,
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN_MM * 2;
  const usableBottom = pageHeight - PDF_MARGIN_MM - PDF_FOOTER_SPACE_MM;
  const usableHeight = usableBottom - PDF_MARGIN_MM;
  const renderHeight = (canvas.height * contentWidth) / canvas.width;

  const appendSlice = (sourceCanvas: HTMLCanvasElement, y: number) => {
    const imageData = sourceCanvas.toDataURL("image/png");
    const heightMm = (sourceCanvas.height * contentWidth) / sourceCanvas.width;
    pdf.addImage(
      imageData,
      "PNG",
      PDF_MARGIN_MM,
      y,
      contentWidth,
      heightMm,
      undefined,
      "FAST",
    );
    return heightMm;
  };

  if (renderHeight <= usableBottom - cursor.y) {
    cursor.y += appendSlice(canvas, cursor.y) + gapAfterMm;
    return;
  }

  if (renderHeight <= usableHeight) {
    pdf.addPage();
    cursor.y = PDF_MARGIN_MM;
    cursor.y += appendSlice(canvas, cursor.y) + gapAfterMm;
    return;
  }

  let offsetPx = 0;

  while (offsetPx < canvas.height) {
    let availableMm = usableBottom - cursor.y;

    if (availableMm < 24) {
      pdf.addPage();
      cursor.y = PDF_MARGIN_MM;
      availableMm = usableHeight;
    }

    const sliceHeightPx = Math.max(
      1,
      Math.min(
        canvas.height - offsetPx,
        Math.floor((canvas.width * availableMm) / contentWidth),
      ),
    );

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;

    const context = pageCanvas.getContext("2d");
    context?.drawImage(
      canvas,
      0,
      offsetPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    const renderedHeight = appendSlice(pageCanvas, cursor.y);
    offsetPx += sliceHeightPx;

    if (offsetPx < canvas.height) {
      pdf.addPage();
      cursor.y = PDF_MARGIN_MM;
      continue;
    }

    cursor.y += renderedHeight + gapAfterMm;
  }
}

async function renderBlocksToPdf(
  blocks: Array<{ element: HTMLElement; gapAfterMm?: number }>,
  filename: string,
  options: { showPageNumbers?: boolean } = {},
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const cursor = { y: PDF_MARGIN_MM };

  for (const block of blocks) {
    const canvas = await renderElementToCanvas(block.element, html2canvas);
    addCanvasToPdf(pdf, canvas, cursor, block.gapAfterMm ?? PDF_BLOCK_GAP_MM);
  }

  if (options.showPageNumbers ?? true) {
    const totalPages = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
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
  }

  pdf.save(filename);
}

async function exportDocument({
  language,
  title,
  eyebrow,
  description,
  metaBlocks,
  listSections,
  filename,
  theme,
}: {
  language: ExportLanguage;
  title: string;
  eyebrow: string;
  description: string;
  metaBlocks: Array<{ label: string; value: string }>;
  listSections: ExportSection[];
  filename: string;
  theme: PdfTheme;
}) {
  const allPaths = listSections.flatMap((section) =>
    section.items.flatMap((item) => item.attachments),
  );
  const attachmentResolution = await resolveAttachmentMap(allPaths);
  const { mount, body } = createDocumentMount();

  try {
    const blocks: Array<{ element: HTMLElement; gapAfterMm?: number }> = [];

    const headerBlock = createHeaderBlock({
      eyebrow,
      title,
      description,
      theme,
    });
    body.append(headerBlock);
    blocks.push({ element: headerBlock, gapAfterMm: 6 });

    const metaGrid = createMetaGridBlock(metaBlocks);
    body.append(metaGrid);
    blocks.push({ element: metaGrid, gapAfterMm: 6 });

    listSections.forEach((section) => {
      if (section.layout === "compact") {
        const compactWrapper = createElement("section", {
          display: "grid",
          gap: "12px",
          paddingTop: "4px",
        });
        compactWrapper.append(
          createSectionTitle(section.title, section.description, theme),
          createCompactListBlock(section.items, theme, language),
        );
        body.append(compactWrapper);
        blocks.push({ element: compactWrapper, gapAfterMm: 6 });
        return;
      }

      if (section.items.length === 0) {
        const emptyWrapper = createElement("section", {
          display: "grid",
          gap: "12px",
          paddingTop: "4px",
        });
        emptyWrapper.append(
          createSectionTitle(section.title, section.description, theme),
          createEmptyStateBlock(language),
        );
        body.append(emptyWrapper);
        blocks.push({ element: emptyWrapper, gapAfterMm: 6 });
        return;
      }

      const firstItemImages = section.items[0].attachments
        .map((path) => attachmentResolution.map.get(path))
        .filter((value): value is string => Boolean(value));
      const leadBlock = createElement("section", {
        display: "grid",
        gap: "12px",
        paddingTop: "4px",
      });
      leadBlock.append(
        createSectionTitle(section.title, section.description, theme),
        createItemCard(section.items[0], 0, theme, firstItemImages, language),
      );
      body.append(leadBlock);
      blocks.push({ element: leadBlock, gapAfterMm: 5 });

      section.items.slice(1).forEach((item, index) => {
        const images = item.attachments
          .map((path) => attachmentResolution.map.get(path))
          .filter((value): value is string => Boolean(value));
        const card = createItemCard(item, index + 1, theme, images, language);
        body.append(card);
        blocks.push({ element: card, gapAfterMm: 5 });
      });
    });

    await renderBlocksToPdf(blocks, filename);
  } finally {
    mount.remove();
  }
}

function getDailyToneStyles(tone: "blue" | "rose" | "emerald") {
  if (tone === "rose") {
    return {
      border: "#fecdd3",
      background: "#fff1f2",
      title: "#be123c",
      text: "#9f1239",
      icon: "#e11d48",
      chip: "#ffe4e6",
      photoBackground: "#fff7f8",
    };
  }

  if (tone === "emerald") {
    return {
      border: "#bbf7d0",
      background: "#f0fdf4",
      title: "#047857",
      text: "#065f46",
      icon: "#10b981",
      chip: "#d1fae5",
      photoBackground: "#f7fffb",
    };
  }

  return {
    border: "#bfdbfe",
    background: "#f8fbff",
    title: "#1d4ed8",
    text: "#172554",
    icon: "#3b82f6",
    chip: "#dbeafe",
    photoBackground: "#f8fbff",
  };
}

function formatReportTime(value: string | null | undefined) {
  if (!value || value === "--") {
    return "--";
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`;
  }

  return value;
}

function formatGeneratedAt(language: ExportLanguage) {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  return getLabel(language, `Generated: ${date} ${time}`, `生成时间: ${date} ${time}`);
}

function createSmallIcon(label: string, color: string) {
  const icon = createElement(
    "div",
    {
      width: "28px",
      height: "28px",
      borderRadius: "999px",
      background: "#ffffff",
      border: "1px solid #e5eefb",
      color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "15px",
      fontWeight: "800",
      flex: "0 0 28px",
    },
    label,
  );

  return icon;
}

function createDailyReportHeader({
  language,
  recordNumber,
}: {
  language: ExportLanguage;
  recordNumber: number;
}) {
  const header = createElement("section", {
    minHeight: "118px",
    background: "#1f2d40",
    color: "#ffffff",
    padding: "22px 22px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "28px",
  });
  const left = createElement("div", {
    display: "grid",
    gap: "12px",
  });
  const titleRow = createElement("div", {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  });
  titleRow.append(
    createElement(
      "div",
      {
        color: "#60a5fa",
        fontSize: "24px",
        fontWeight: "900",
      },
      "▣",
    ),
    createElement(
      "h1",
      {
        margin: "0",
        fontSize: "30px",
        lineHeight: "1.15",
        fontWeight: "900",
        letterSpacing: "0",
      },
      getLabel(language, "Customer Project Service Summary", "客户项目服务摘要"),
    ),
  );
  left.append(
    titleRow,
    createElement(
      "p",
      {
        margin: "0",
        color: "#b6c3d6",
        fontSize: "16px",
        lineHeight: "1.5",
      },
      getLabel(
        language,
        "Daily service report prepared for project stakeholders, covering completed work, risks, and next steps.",
        "面向项目相关方整理的服务日报，汇总当日情况及风险计划。",
      ),
    ),
  );

  const right = createElement("div", {
    display: "grid",
    gap: "6px",
    justifyItems: "end",
    minWidth: "190px",
  });
  right.append(
    createElement(
      "div",
      {
        color: "#94a3b8",
        fontSize: "14px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      },
      getLabel(language, "Report ID", "编号 / REPORT ID"),
    ),
    createElement(
      "div",
      {
        color: "#60a5fa",
        fontSize: "30px",
        fontWeight: "900",
        letterSpacing: "0.08em",
        fontFamily: "monospace",
      },
      `#${recordNumber}`,
    ),
  );

  header.append(left, right);
  return header;
}

function createDailyMetaCard({
  icon,
  label,
  value,
  gridColumn,
}: {
  icon: string;
  label: string;
  value: string;
  gridColumn?: string;
}) {
  const card = createElement("div", {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    border: "1px solid #e5eaf2",
    background: "#ffffff",
    borderRadius: "10px",
    padding: "20px 22px",
    minHeight: "90px",
    gridColumn: gridColumn ?? "auto",
  });
  const copy = createElement("div", {
    display: "grid",
    gap: "7px",
    minWidth: "0",
  });
  copy.append(
    createElement(
      "div",
      {
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: "800",
      },
      label,
    ),
    createElement(
      "div",
      {
        color: "#111827",
        fontSize: "16px",
        lineHeight: "1.35",
        fontWeight: "800",
        wordBreak: "break-word",
      },
      value || "--",
    ),
  );
  card.append(createSmallIcon(icon, "#3b82f6"), copy);
  return card;
}

function createDailyMetaGrid({
  language,
  projectName,
  authorName,
  fieldCrew,
  report,
  resolvedStartTime,
  resolvedEndTime,
}: {
  language: ExportLanguage;
  projectName: string;
  authorName: string;
  fieldCrew: string[];
  report: DailyReport;
  resolvedStartTime: string;
  resolvedEndTime: string;
}) {
  const crewText = fieldCrew.join(language === "zh" ? "、" : ", ");
  const grid = createElement("section", {
    display: "grid",
    gap: "22px",
    gridTemplateColumns: "1.2fr 0.58fr 0.58fr",
  });
  grid.append(
    createDailyMetaCard({
      icon: "□",
      label: getLabel(language, "Project name", "项目名称"),
      value: projectName,
    }),
    createDailyMetaCard({
      icon: "□",
      label: getLabel(language, "Date", "日期"),
      value: formatDisplayDate(report.date, language),
    }),
    createDailyMetaCard({
      icon: "○",
      label: getLabel(language, "Shift", "班次"),
      value: report.shift || "--",
    }),
    createDailyMetaCard({
      icon: "○",
      label: getLabel(language, "Submitted by", "提交人/出勤"),
      value: crewText ? `${authorName} (${crewText})` : authorName,
      gridColumn: "span 1",
    }),
    createDailyMetaCard({
      icon: "○",
      label: getLabel(language, "Arrival / departure", "到场/离场时间"),
      value: `${formatReportTime(resolvedStartTime)} / ${formatReportTime(resolvedEndTime)}`,
      gridColumn: "span 2",
    }),
  );
  return grid;
}

function createDailyPhotoGrid({
  paths,
  attachmentResolution,
  tone,
  language,
}: {
  paths: string[];
  attachmentResolution: AttachmentResolution;
  tone: "blue" | "rose" | "emerald";
  language: ExportLanguage;
}) {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.trim().length > 0)));

  if (uniquePaths.length === 0) {
    return null;
  }

  const colors = getDailyToneStyles(tone);
  const grid = createElement("div", {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    paddingLeft: tone === "rose" ? "48px" : "40px",
    marginTop: "14px",
  });

  uniquePaths.forEach((path, index) => {
    const source = attachmentResolution.map.get(path);
    const tile = createElement("figure", {
      margin: "0",
      width: "166px",
      minHeight: "126px",
      border: `1px dashed ${colors.border}`,
      borderRadius: "8px",
      background: colors.photoBackground,
      display: "grid",
      placeItems: "center",
      overflow: "hidden",
    });

    if (source) {
      const image = createElement("img", {
        maxWidth: "100%",
        width: "100%",
        height: "auto",
        maxHeight: "170px",
        objectFit: "contain",
        display: "block",
      }) as HTMLImageElement;
      image.src = source;
      image.alt = `${getLabel(language, "Field photo", "现场照片")} ${index + 1}`;
      tile.append(image);
    } else {
      const placeholder = createElement("div", {
        display: "grid",
        gap: "8px",
        justifyItems: "center",
        color: colors.icon,
        fontSize: "12px",
        fontWeight: "800",
        textAlign: "center",
      });
      placeholder.append(
        createElement("div", { fontSize: "24px", lineHeight: "1" }, "▧"),
        createElement(
          "div",
          {},
          getLabel(language, `Photo ${index + 1} unavailable`, `现场照片 ${index + 1} 无法载入`),
        ),
      );
      tile.append(placeholder);
    }

    grid.append(tile);
  });

  return grid;
}

function createDailySectionBlock({
  language,
  tone,
  title,
  items,
  attachmentResolution,
}: {
  language: ExportLanguage;
  tone: "blue" | "rose" | "emerald";
  title: string;
  items: ExportListItem[];
  attachmentResolution: AttachmentResolution;
}) {
  const colors = getDailyToneStyles(tone);
  const section = createElement("section", {
    border: `1px solid ${colors.border}`,
    background: colors.background,
    borderRadius: "10px",
    padding: "30px 30px 30px",
    display: "grid",
    gap: "20px",
    overflow: "hidden",
  });
  const titleRow = createElement("div", {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: colors.title,
  });
  titleRow.append(
    createElement(
      "div",
      {
        color: colors.icon,
        fontSize: "24px",
        fontWeight: "900",
      },
      tone === "rose" ? "△" : "▣",
    ),
    createElement(
      "h2",
      {
        margin: "0",
        color: colors.title,
        fontSize: "22px",
        lineHeight: "1.25",
        fontWeight: "900",
      },
      title,
    ),
  );
  section.append(titleRow);

  if (items.length === 0) {
    section.append(
      createElement(
        "div",
        {
          border: `1px dashed ${colors.border}`,
          background: "#ffffff",
          borderRadius: "8px",
          padding: "18px 20px",
          color: "#64748b",
          fontSize: "15px",
        },
        getLabel(language, "No items recorded.", "暂无条目。"),
      ),
    );
    return section;
  }

  const list = createElement("div", {
    display: "grid",
    gap: tone === "rose" ? "18px" : "16px",
  });

  items.forEach((item, index) => {
    const row = createElement("div", {
      display: "grid",
      gap: "10px",
      background: tone === "rose" ? "#ffffff" : "transparent",
      borderLeft: tone === "rose" ? `4px solid ${colors.icon}` : "0",
      borderRadius: tone === "rose" ? "8px" : "0",
      padding: tone === "rose" ? "20px 18px 20px 24px" : "0",
    });
    const line = createElement("div", {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
    });
    line.append(
      createElement(
        "span",
        {
          width: "20px",
          height: "20px",
          borderRadius: "999px",
          background: tone === "rose" ? "#ffe4e6" : "#ffffff",
          border: `2px solid ${colors.icon}`,
          color: colors.icon,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: tone === "rose" ? "11px" : "13px",
          lineHeight: "1",
          fontWeight: "900",
          flex: "0 0 20px",
          marginTop: "2px",
        },
        tone === "rose" ? String(index + 1) : "✓",
      ),
      createElement(
        "div",
        {
          color: tone === "rose" ? colors.text : "#1f2937",
          fontSize: "18px",
          lineHeight: "1.6",
          fontWeight: tone === "rose" ? "800" : "600",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        },
        item.text.trim() || getLabel(language, "Photo only", "仅图片"),
      ),
    );
    row.append(line);

    const photoGrid = createDailyPhotoGrid({
      paths: item.attachments,
      attachmentResolution,
      tone,
      language,
    });

    if (photoGrid) {
      row.append(photoGrid);
    }

    list.append(row);
  });

  section.append(list);
  return section;
}

function createDailyFooter(language: ExportLanguage) {
  const footer = createElement("footer", {
    minHeight: "48px",
    background: "#f1f5f9",
    color: "#64748b",
    padding: "16px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    borderTop: "1px solid #e2e8f0",
  });
  footer.append(
    createElement(
      "div",
      {},
      getLabel(language, "Internal document. Handle with care.", "内部文档，请注意保密。"),
    ),
    createElement("div", {}, formatGeneratedAt(language)),
  );
  return footer;
}

function createDailyContentBand({
  element,
  isFirst,
  isLast,
}: {
  element: HTMLElement;
  isFirst: boolean;
  isLast: boolean;
}) {
  const band = createElement("div", {
    background: "#f8fafc",
    padding: `${isFirst ? "44px" : "0"} 22px ${isLast ? "36px" : "34px"}`,
  });
  band.append(element);
  return band;
}

export async function exportDailyReportPdf({
  report,
  projectName,
  authorName,
  fallbackStartTime,
  fallbackEndTime,
  fallbackFieldCrew,
  language,
}: {
  report: DailyReport;
  projectName: string;
  authorName: string;
  fallbackStartTime?: string | null;
  fallbackEndTime?: string | null;
  fallbackFieldCrew?: string[];
  language: ExportLanguage;
}): Promise<DailyReportPdfExportResult> {
  let majorTasks = filterItems(report.majorTaskItems);
  const blockers = filterItems(report.blockerItems);
  const nextDayPlan = filterItems(report.nextDayPlanItems);
  const itemPathCount = [...majorTasks, ...blockers, ...nextDayPlan].reduce(
    (total, item) => total + item.attachments.length,
    0,
  );
  const legacyAttachmentPaths = report.attachments.filter((path) => path.trim().length > 0);
  const usedLegacyAttachmentFallback = itemPathCount === 0 && legacyAttachmentPaths.length > 0;

  if (usedLegacyAttachmentFallback) {
    if (majorTasks.length === 0) {
      majorTasks = [
        {
          text: getLabel(language, "Field photos", "现场照片"),
          attachments: legacyAttachmentPaths,
        },
      ];
    } else {
      majorTasks = [
        {
          ...majorTasks[0],
          attachments: Array.from(
            new Set([...majorTasks[0].attachments, ...legacyAttachmentPaths]),
          ),
        },
        ...majorTasks.slice(1),
      ];
    }
  }

  const allPaths = Array.from(
    new Set(
      [...majorTasks, ...blockers, ...nextDayPlan]
        .flatMap((item) => item.attachments)
        .filter((path) => path.trim().length > 0),
    ),
  );
  const attachmentResolution = await resolveAttachmentMap(allPaths);
  const resolvedStartTime = report.startTime || fallbackStartTime || "--";
  const resolvedEndTime = report.endTime || fallbackEndTime || "--";
  const resolvedFieldCrew = Array.from(
    new Set(
      (report.fieldCrew.length > 0 ? report.fieldCrew : fallbackFieldCrew ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  const { mount, body } = createDocumentMount();

  try {
    body.style.gap = "0";
    body.style.background = "#f8fafc";

    const blocks: Array<{ element: HTMLElement; gapAfterMm?: number }> = [];
    const header = createDailyReportHeader({
      language,
      recordNumber: report.recordNumber,
    });
    body.append(header);
    blocks.push({ element: header, gapAfterMm: 0 });

    const metaGrid = createDailyMetaGrid({
      language,
      projectName,
      authorName,
      fieldCrew: resolvedFieldCrew,
      report,
      resolvedStartTime,
      resolvedEndTime,
    });
    const dailyContentBlocks = [
      metaGrid,
      createDailySectionBlock({
        language,
        tone: "blue",
        title: getLabel(language, "Major tasks completed", "主要工作（当日已完成）"),
        items: majorTasks,
        attachmentResolution,
      }),
      createDailySectionBlock({
        language,
        tone: "rose",
        title: getLabel(language, "Blockers / risks", "阻碍 / 风险"),
        items: blockers,
        attachmentResolution,
      }),
      createDailySectionBlock({
        language,
        tone: "emerald",
        title: getLabel(language, "Next-day plan", "次日计划"),
        items: nextDayPlan,
        attachmentResolution,
      }),
    ];

    dailyContentBlocks.forEach((element, index) => {
      const band = createDailyContentBand({
        element,
        isFirst: index === 0,
        isLast: index === dailyContentBlocks.length - 1,
      });
      body.append(band);
      blocks.push({ element: band, gapAfterMm: 0 });
    });

    const footer = createDailyFooter(language);
    body.append(footer);
    blocks.push({ element: footer, gapAfterMm: 0 });

    await renderBlocksToPdf(
      blocks,
      `${getSafeFileStem(projectName)}-daily-report-${report.recordNumber}.pdf`,
      { showPageNumbers: false },
    );
  } finally {
    mount.remove();
  }

  return {
    storedPathCount: attachmentResolution.requestedCount,
    renderedPathCount: attachmentResolution.map.size,
    failedPaths: attachmentResolution.failed,
    usedLegacyAttachmentFallback,
  };
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
    language,
    title: getLabel(language, "Service Incident Record", "服务异常记录"),
    eyebrow: getLabel(language, "Project issue documentation", "项目异常记录"),
    description: getLabel(
      language,
      "Prepared for project stakeholders to document the issue observed on site, immediate containment actions, follow-up work, and supporting field images.",
      "面向项目相关方整理的异常记录，说明现场问题事实、即时控制动作、后续跟进事项及相关现场图片。",
    ),
    metaBlocks: [
      { label: getLabel(language, "Record #", "编号"), value: `#${incident.recordNumber}` },
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
          "Observed issue details captured for customer communication and follow-up review.",
          "供客户沟通和后续复盘使用的现场事实记录。",
        ),
        items: facts,
      },
      {
        title: getLabel(language, "Immediate action", "即时动作"),
        description: getLabel(
          language,
          "Immediate containment, protection, or recovery actions taken on site.",
          "现场已立即采取的控制、保护或恢复动作。",
        ),
        items: immediateActions,
      },
      {
        title: getLabel(language, "Follow-up / closeout", "后续跟进"),
        description: getLabel(
          language,
          "Further corrective work, ownership items, or closure steps.",
          "后续整改、责任跟进或关闭事项。",
        ),
        items: followUps,
      },
    ],
    filename: `${getSafeFileStem(projectName)}-incident-${incident.recordNumber}.pdf`,
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
    language,
    title: getLabel(language, "Safety Briefing Record", "安全签到记录"),
    eyebrow: getLabel(language, "Pre-work field safety record", "开工前安全记录"),
    description: getLabel(
      language,
      "Prepared before field activity begins to confirm work scope, key hazards, PPE readiness, briefing points, and supporting notes for the project team and site stakeholders.",
      "面向项目团队及现场相关方整理的开工前安全记录，确认作业内容、关键风险、PPE 准备情况、briefing 要点及补充备注。",
    ),
    metaBlocks: [
      { label: getLabel(language, "Record #", "编号"), value: `#${checkin.recordNumber}` },
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
        title: getLabel(language, "Work scope", "作业范围"),
        description: getLabel(
          language,
          "The work categories covered by this pre-job safety review.",
          "本次开工前安全确认所覆盖的作业类型。",
        ),
        items: stringArrayToItems(checkin.taskTypes),
        layout: "compact",
      },
      {
        title: getLabel(language, "Key hazards", "关键风险"),
        description: getLabel(
          language,
          "Primary hazards identified before work started.",
          "开工前已识别的主要风险项。",
        ),
        items: stringArrayToItems(checkin.hazardFlags),
        layout: "compact",
      },
      {
        title: getLabel(language, "PPE confirmed", "PPE 确认"),
        description: getLabel(
          language,
          "Protective equipment verified for this shift.",
          "本班次已确认到位的个人防护装备。",
        ),
        items: stringArrayToItems(checkin.ppeFlags),
        layout: "compact",
      },
      {
        title: getLabel(language, "Briefing topic", "安全 briefing"),
        description: getLabel(
          language,
          "Core safety points communicated before work began.",
          "开工前已沟通的重点安全提示。",
        ),
        items: stringArrayToItems([checkin.briefingTopic]),
      },
      {
        title: getLabel(language, "Notes", "备注"),
        description: getLabel(
          language,
          "Additional site notes recorded during the safety confirmation.",
          "安全确认过程中补充记录的现场备注。",
        ),
        items: stringArrayToItems([checkin.notes]),
      },
    ],
    filename: `${getSafeFileStem(projectName)}-safety-checkin-${checkin.recordNumber}.pdf`,
    theme: SAFETY_THEME,
  });
}
