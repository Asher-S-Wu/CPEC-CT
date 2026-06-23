import type { ScraperRecordDoc } from "@/lib/scraper/types";

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

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item : safeStringify(item))).filter(Boolean)
    : [];
}

export interface ScraperExportContext {
  sourceNames?: Map<string, string>;
  runCreatedAt?: Map<string, Date>;
}

export function toScraperExportRow(record: ScraperRecordDoc, context: ScraperExportContext = {}) {
  const sourceId = String(record.sourceId);
  const runId = String(record.runId);
  const content = typeof record.payload.content === "string" ? record.payload.content : "";
  const summary = typeof record.payload.summary === "string" ? record.payload.summary : "";
  const favicon = typeof record.payload.favicon === "string" ? record.payload.favicon : "";
  const images = stringArray(record.payload.images);
  const sourceLinks = stringArray(record.payload.sourceLinks);

  return {
    任务名称: context.sourceNames?.get(sourceId) || "",
    运行ID: runId,
    运行时间: formatDateTime(context.runCreatedAt?.get(runId) || null),
    类型: record.kind,
    标题: record.title,
    来源链接: record.url,
    发布时间: formatDateTime(record.publishedAt ?? null),
    相关度: typeof record.metrics.score === "number" ? record.metrics.score : "",
    摘要: summary,
    正文: content,
    图片: images.length > 0 ? safeStringify(images) : "",
    站点图标: favicon,
    来源列表: sourceLinks.length > 0 ? safeStringify(sourceLinks) : "",
    创建时间: formatDateTime(record.createdAt),
    更新时间: formatDateTime(record.updatedAt)
  };
}
