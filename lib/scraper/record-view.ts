import type { ScraperRecordDoc, ScraperResultView } from "@/lib/scraper/types";

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value) || "";
  } catch {
    return "";
  }
}

function formatDateTime(value?: Date | null) {
  return value
    ? new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Shanghai"
      }).format(value)
    : "";
}

function shortText(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function getPagePayload(record: ScraperRecordDoc) {
  return {
    metadata: (record.payload.metadata ?? {}) as Record<string, unknown>,
    markdown: typeof record.payload.markdown === "string" ? record.payload.markdown : "",
    html: typeof record.payload.html === "string" ? record.payload.html : "",
    rawHtml: typeof record.payload.rawHtml === "string" ? record.payload.rawHtml : "",
    summary: typeof record.payload.summary === "string" ? record.payload.summary : "",
    extractedJson: record.payload.extractedJson ?? null,
    links: Array.isArray(record.payload.links) ? record.payload.links : [],
    finalUrl: typeof record.payload.finalUrl === "string" ? record.payload.finalUrl : "",
    statusCode: typeof record.payload.statusCode === "number" ? record.payload.statusCode : null
  };
}

export function toScraperResultView(record: ScraperRecordDoc): ScraperResultView {
  const page = getPagePayload(record);
  const outputFormats = [
    page.markdown ? "markdown" : "",
    page.html ? "html" : "",
    page.rawHtml ? "raw_html" : "",
    page.summary ? "summary" : "",
    page.links.length > 0 ? "links" : "",
    page.extractedJson ? "json" : ""
  ]
    .filter(Boolean)
    .join(", ");

  const finalUrl =
    page.finalUrl ||
    (typeof record.payload.finalUrl === "string" ? record.payload.finalUrl : "") ||
    record.url;

  const summary =
    page.summary ||
    shortText(page.markdown || page.html || page.rawHtml || (typeof record.payload.snippet === "string" ? record.payload.snippet : ""));

  return {
    id: String(record._id),
    kind: record.kind,
    title: record.title,
    url: record.url,
    finalUrl,
    summary,
    jsonText: page.extractedJson ? shortText(safeStringify(page.extractedJson), 160) : "",
    outputFormats,
    publishedAt: record.publishedAt ?? null,
    statusCode: page.statusCode,
    metricsText: shortText(safeStringify(record.metrics), 120)
  };
}

export interface ScraperExportContext {
  sourceNames?: Map<string, string>;
  runCreatedAt?: Map<string, Date>;
}

export function toScraperExportRow(record: ScraperRecordDoc, context: ScraperExportContext = {}) {
  const page = getPagePayload(record);
  const sourceId = String(record.sourceId);
  const runId = String(record.runId);
  const finalUrl =
    page.finalUrl ||
    (typeof record.payload.finalUrl === "string" ? record.payload.finalUrl : "") ||
    record.url;
  const outputFormats = [
    page.markdown ? "markdown" : "",
    page.summary ? "summary" : "",
    page.links.length > 0 ? "links" : "",
    page.extractedJson ? "json" : "",
    page.statusCode !== null ? "status" : ""
  ].filter(Boolean).join(", ");

  return {
    任务名称: context.sourceNames?.get(sourceId) || "",
    运行ID: runId,
    运行时间: formatDateTime(context.runCreatedAt?.get(runId) || null),
    类型: record.kind,
    标题: record.title,
    原始链接: record.url,
    最终链接: finalUrl,
    发布时间: formatDateTime(record.publishedAt ?? null),
    状态码: page.statusCode ?? "",
    输出格式: outputFormats,
    摘要: page.summary,
    正文Markdown: page.markdown,
    JSON提取: page.extractedJson ? safeStringify(page.extractedJson) : "",
    链接列表: page.links.length > 0 ? safeStringify(page.links) : "",
    指标: safeStringify(record.metrics),
    创建时间: formatDateTime(record.createdAt),
    更新时间: formatDateTime(record.updatedAt)
  };
}
