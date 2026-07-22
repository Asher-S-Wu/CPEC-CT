import {
  createAttachmentDescriptor,
  getAttachmentCategory,
  getAttachmentLimits,
  isDocumentAttachment,
  isSupportedDocumentExtension,
  normalizeMimeType,
} from "@/lib/ai/shared/attachments";
import {
  findStoredFileByIdForUser,
  toStoredFileDescriptor,
  updateStoredFileForUser,
} from "@/lib/storage/repository";
import { getStoredFilePathForUser } from "@/lib/storage/server";
import { parseAttachmentLocally } from "@/lib/ai/server/files/localParser";

const FILE_PARSE_VERSION = 4;

function normalizeExtractedText(text, maxChars = 0) {
  if (typeof text !== "string") return "";
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (maxChars > 0 && normalized.length > maxChars) {
    return `${normalized.slice(0, maxChars)}...`;
  }
  return normalized;
}

function normalizeVisualAssets(visualAssets) {
  if (!Array.isArray(visualAssets)) return [];
  return visualAssets
    .filter((item) => item?.fileId && item?.url && item?.mimeType)
    .slice(0, 6)
    .map((item, index) => ({
      fileId: item.fileId,
      url: item.url,
      mimeType: normalizeMimeType(item.mimeType) || "image/png",
      size: Number(item.size) || 0,
      label: typeof item.label === "string" && item.label ? item.label : `视觉内容 ${index + 1}`,
      sourceType: typeof item.sourceType === "string" && item.sourceType ? item.sourceType : "embedded-image",
      page: Number.isFinite(item.page) ? item.page : null,
      sheet: typeof item.sheet === "string" && item.sheet ? item.sheet : null,
    }));
}

function buildPreparedFileDescriptor(storedFile, { formatSummary = "", visualAssets = [] } = {}) {
  const descriptor = toStoredFileDescriptor(storedFile);
  const assets = normalizeVisualAssets(visualAssets);
  return {
    ...createAttachmentDescriptor(descriptor),
    fileId: descriptor.fileId,
    formatSummary: normalizeExtractedText(formatSummary),
    visualAssetCount: assets.length,
    visualAssets: assets,
  };
}

function pickVisualSummaryText(visualAssets) {
  const assets = Array.isArray(visualAssets) ? visualAssets : [];
  if (assets.length === 0) return "";
  const labels = assets.slice(0, 4).map((item) => item?.label || item?.sourceType || "图片").filter(Boolean);
  return `已额外提取 ${assets.length} 个视觉内容${labels.length ? `：${labels.join("、")}` : ""}`;
}

function isReadyStoredFile(storedFile) {
  return storedFile?.parseStatus === "ready"
    && typeof storedFile?.extractedText === "string"
    && storedFile.extractedText.trim()
    && Number(storedFile?.parseVersion) >= FILE_PARSE_VERSION
    && storedFile?.parseProvider === "local-python";
}

function buildPreparedFromStoredFile(storedFile) {
  const visualAssets = normalizeVisualAssets(storedFile.visualAssets);
  const descriptor = buildPreparedFileDescriptor(storedFile, {
    formatSummary: storedFile.formatSummary,
    visualAssets,
  });
  return {
    file: descriptor,
    extractedText: storedFile.extractedText,
    structuredText: storedFile.structuredText || storedFile.extractedText,
    formatSummary: storedFile.formatSummary || "",
    visualAssets,
    visualAssetCount: Number(storedFile.visualAssetCount) || visualAssets.length,
    pageCount: Number.isFinite(storedFile.pageCount) ? storedFile.pageCount : null,
    sheetCount: Number.isFinite(storedFile.sheetCount) ? storedFile.sheetCount : null,
    rowCount: Number.isFinite(storedFile.rowCount) ? storedFile.rowCount : null,
    cellCount: Number.isFinite(storedFile.cellCount) ? storedFile.cellCount : null,
    maxCols: Number.isFinite(storedFile.maxCols) ? storedFile.maxCols : null,
  };
}

function validateDocumentFile(storedFile) {
  const extension = storedFile.extension;
  const mimeType = normalizeMimeType(storedFile.mimeType);
  const category = storedFile.category || getAttachmentCategory({ extension, mimeType });
  const limits = getAttachmentLimits(category);
  if (limits?.maxBytes && storedFile.size > limits.maxBytes) {
    throw new Error("文件大小超过系统限制");
  }
  if (!extension || !isSupportedDocumentExtension(extension) || !isDocumentAttachment({ extension, mimeType })) {
    throw new Error("该文件不是可解析的文档附件");
  }
  return { category, limits };
}

export async function prepareDocumentAttachment({ userId, fileId, signal }) {
  const storedFile = await findStoredFileByIdForUser(fileId, userId);
  if (!storedFile) throw new Error("文件不存在或无权访问");
  const { category, limits } = validateDocumentFile(storedFile);

  if (isReadyStoredFile(storedFile)) {
    return buildPreparedFromStoredFile(storedFile);
  }

  const parseStartedAt = new Date();
  await updateStoredFileForUser(fileId, userId, {
    parseStatus: "processing",
    parseProvider: "local-python",
    parseStartedAt,
    parseFinishedAt: null,
    errorMessage: null,
  });

  try {
    const { absolutePath } = await getStoredFilePathForUser(fileId, userId);
    const parsed = await parseAttachmentLocally({ userId, storedFile, absolutePath, signal });
    const maxChars = Number(limits?.maxChars) || 0;
    const extractedText = normalizeExtractedText(parsed.prepared.extractedText, maxChars);
    const structuredText = normalizeExtractedText(parsed.prepared.structuredText || parsed.prepared.extractedText, maxChars);
    const formatSummary = normalizeExtractedText(parsed.prepared.formatSummary);
    const visualAssets = normalizeVisualAssets(parsed.prepared.visualAssets);

    await updateStoredFileForUser(fileId, userId, {
      category,
      parseStatus: "ready",
      parseProvider: "local-python",
      parseVersion: FILE_PARSE_VERSION,
      extractedText,
      structuredText,
      formatSummary,
      visualAssets,
      visualAssetCount: visualAssets.length,
      extractedChars: extractedText.length,
      pageCount: Number.isFinite(parsed.prepared.pageCount) ? parsed.prepared.pageCount : null,
      sheetCount: Number.isFinite(parsed.prepared.sheetCount) ? parsed.prepared.sheetCount : null,
      rowCount: Number.isFinite(parsed.prepared.rowCount) ? parsed.prepared.rowCount : null,
      cellCount: Number.isFinite(parsed.prepared.cellCount) ? parsed.prepared.cellCount : null,
      maxCols: Number.isFinite(parsed.prepared.maxCols) ? parsed.prepared.maxCols : null,
      parseStartedAt,
      parseFinishedAt: new Date(),
      errorMessage: null,
    });

    return {
      ...parsed.prepared,
      file: buildPreparedFileDescriptor(storedFile, { formatSummary, visualAssets }),
      extractedText,
      structuredText,
      formatSummary,
      visualAssets,
      visualAssetCount: visualAssets.length,
    };
  } catch (error) {
    await updateStoredFileForUser(fileId, userId, {
      category,
      parseStatus: "failed",
      parseProvider: "local-python",
      parseFinishedAt: new Date(),
      extractedText: null,
      structuredText: null,
      formatSummary: null,
      visualAssets: [],
      visualAssetCount: 0,
      extractedChars: 0,
      pageCount: null,
      sheetCount: null,
      rowCount: null,
      cellCount: null,
      maxCols: null,
      errorMessage: error?.message || "文件解析失败",
    });
    throw error;
  }
}

export async function prepareDocumentAttachmentMapByFiles(files, { userId, signal } = {}) {
  const map = new Map();
  const uniqueIds = Array.from(new Set(
    (Array.isArray(files) ? files : []).map((item) => item?.fileId).filter(Boolean)
  ));

  for (const fileId of uniqueIds) {
    const prepared = await prepareDocumentAttachment({ userId, fileId, signal });
    if (prepared?.file?.url) map.set(prepared.file.url, prepared);
  }
  return map;
}

export function buildAttachmentTextBlock(fileData, extractedText) {
  const descriptor = createAttachmentDescriptor(fileData || {});
  const formatSummary = normalizeExtractedText(fileData?.formatSummary || "");
  const visualCount = Number(fileData?.visualAssetCount) || (Array.isArray(fileData?.visualAssets) ? fileData.visualAssets.length : 0);
  const visualSummary = pickVisualSummaryText(fileData?.visualAssets);
  const meta = [
    descriptor.name ? `文件名：${descriptor.name}` : "",
    descriptor.extension ? `扩展名：${descriptor.extension}` : "",
    descriptor.mimeType ? `类型：${descriptor.mimeType}` : "",
    formatSummary ? `结构说明：${formatSummary}` : "",
    visualCount > 0 ? `视觉内容：${visualSummary || `已提取 ${visualCount} 个视觉内容`}` : "",
  ].filter(Boolean);

  return [
    "[附件开始]",
    ...meta,
    "以下是附件提取出的结构化内容：",
    normalizeExtractedText(extractedText),
    "[附件结束]",
  ].join("\n");
}
