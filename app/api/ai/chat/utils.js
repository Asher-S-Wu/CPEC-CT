import { normalizeFileId } from '@/lib/ai/shared/fileIds';
import { isStoredFileUrl } from '@/lib/ai/shared/fileUrls';

/**
 * AI 聊天接口共用工具函数
 */

const MAX_STORED_MESSAGES = 500;
const MAX_STORED_MESSAGE_CHARS = 20000;
const MAX_STORED_PART_TEXT_CHARS = 10000;
const MAX_STORED_PARTS_PER_MESSAGE = 20;
const MAX_STORED_MESSAGE_ID_CHARS = 128;
const MAX_STORED_TOTAL_TEXT_CHARS = 1_000_000;
const MAX_STORED_IMAGE_URL_CHARS = 2048;

function createValidationError(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

function isAllowedStoredFileUrl(url) {
    if (typeof url !== "string" || !url.trim() || url.length > MAX_STORED_IMAGE_URL_CHARS) return false;
    return isStoredFileUrl(url);
}

export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

export function generateMessageId() {
    const rand = Math.random().toString(36).slice(2, 10);
    return `msg_${Date.now()}_${rand}`;
}

export function getStoredPartsFromMessage(msg, { includeThoughtSignature = false } = {}) {
    if (!msg || typeof msg !== 'object') return null;

    if (Array.isArray(msg.parts) && msg.parts.length > 0) {
        const normalizedParts = msg.parts
            .filter((part) => part && typeof part === 'object')
            .map((part) => {
                const out = {};
                if (isNonEmptyString(part.text)) out.text = part.text;
                if (part.thought === true) out.thought = true;
                if (part?.inlineData && typeof part.inlineData === 'object') {
                    const url = part.inlineData.url;
                    const mimeType = part.inlineData.mimeType;
                    if (isNonEmptyString(url)) {
                        out.inlineData = {
                            url,
                            mimeType: isNonEmptyString(mimeType) ? mimeType : 'image/jpeg',
                        };
                        const fileId = normalizeFileId(part.inlineData.fileId);
                        if (fileId) out.inlineData.fileId = fileId;
                    }
                }
                if (part?.fileData && typeof part.fileData === 'object') {
                    const url = part.fileData.url;
                    const name = part.fileData.name;
                    const mimeType = part.fileData.mimeType;
                    const extension = part.fileData.extension;
                    const category = part.fileData.category;
                    const size = Number(part.fileData.size);
                    if (isNonEmptyString(url) && isNonEmptyString(name) && isNonEmptyString(mimeType) && isNonEmptyString(extension) && isNonEmptyString(category) && Number.isFinite(size) && size >= 0) {
                        out.fileData = {
                            url,
                            name,
                            mimeType,
                            size,
                            extension,
                            category,
                        };
                        const fileId = normalizeFileId(part.fileData.fileId);
                        if (fileId) out.fileData.fileId = fileId;
                    }
                }
                if (includeThoughtSignature && isNonEmptyString(part.thoughtSignature)) out.thoughtSignature = part.thoughtSignature;
                return out;
            })
            .filter((part) => Object.keys(part).length > 0);
        if (normalizedParts.length > 0) return normalizedParts;
    }

    const fallbackParts = [];
    if (isNonEmptyString(msg.content)) {
        fallbackParts.push({ text: msg.content });
    }

    return fallbackParts.length > 0 ? fallbackParts : null;
}

export function sanitizeStoredMessage(msg) {
    if (!msg || typeof msg !== 'object') return null;
    if (msg.role !== 'user' && msg.role !== 'model') return null;
    const normalizedParts = getStoredPartsFromMessage(msg);
    if (!normalizedParts || normalizedParts.length === 0) return null;
    const out = {
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : '',
        type: typeof msg.type === 'string' ? msg.type : 'parts',
    };
    if (isNonEmptyString(msg.id) && msg.id.length <= 128) out.id = msg.id;
    if (isNonEmptyString(msg.thought)) out.thought = msg.thought;
    if (Array.isArray(msg.citations) && msg.citations.length > 0) out.citations = msg.citations;
    if (Array.isArray(msg.tools) && msg.tools.length > 0) out.tools = msg.tools;
    if (Array.isArray(msg.artifacts) && msg.artifacts.length > 0) out.artifacts = msg.artifacts;
    if (Array.isArray(msg.thinkingTimeline) && msg.thinkingTimeline.length > 0) out.thinkingTimeline = msg.thinkingTimeline;
    if (Number.isFinite(msg.searchContextTokens) && msg.searchContextTokens > 0) out.searchContextTokens = Math.max(0, Math.floor(msg.searchContextTokens));
    if (msg.providerState && typeof msg.providerState === 'object') out.providerState = msg.providerState;
    out.parts = normalizedParts;
    return out;
}

export function sanitizeStoredMessagesStrict(messages) {
    if (!Array.isArray(messages)) {
        throw createValidationError("messages must be an array");
    }
    if (messages.length > MAX_STORED_MESSAGES) {
        throw createValidationError(`messages too many (max ${MAX_STORED_MESSAGES})`);
    }

    let totalTextChars = 0;
    const sanitized = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const normalized = sanitizeStoredMessage(msg);
        if (!normalized) {
            throw createValidationError(`messages[${i}] invalid`);
        }

        if (normalized.id && normalized.id.length > MAX_STORED_MESSAGE_ID_CHARS) {
            throw createValidationError(`messages[${i}].id too long`);
        }

        if (normalized.content.length > MAX_STORED_MESSAGE_CHARS) {
            throw createValidationError(`messages[${i}].content too long`);
        }

        if (normalized.thought && normalized.thought.length > MAX_STORED_MESSAGE_CHARS) {
            throw createValidationError(`messages[${i}].thought too long`);
        }

        if (!Array.isArray(normalized.parts) || normalized.parts.length === 0) {
            throw createValidationError(`messages[${i}].parts required`);
        }

        if (normalized.parts.length > MAX_STORED_PARTS_PER_MESSAGE) {
            throw createValidationError(`messages[${i}].parts too many`);
        }

        for (let pi = 0; pi < normalized.parts.length; pi++) {
            const part = normalized.parts[pi];
            if (typeof part?.text === "string") {
                if (part.text.length > MAX_STORED_PART_TEXT_CHARS) {
                    throw createValidationError(`messages[${i}].parts[${pi}].text too long`);
                }
                totalTextChars += part.text.length;
            }

            if (part?.inlineData?.url) {
                if (!isAllowedStoredFileUrl(part.inlineData.url)) {
                    throw createValidationError(`messages[${i}].parts[${pi}].image invalid`);
                }
                if (!normalizeFileId(part.inlineData.fileId)) {
                    throw createValidationError(`messages[${i}].parts[${pi}].image fileId invalid`);
                }
            }
            if (part?.fileData?.url) {
                if (!isAllowedStoredFileUrl(part.fileData.url)) {
                    throw createValidationError(`messages[${i}].parts[${pi}].file invalid`);
                }
                if (!isNonEmptyString(part.fileData.name) || part.fileData.name.length > 200) {
                    throw createValidationError(`messages[${i}].parts[${pi}].file name invalid`);
                }
                if (!isNonEmptyString(part.fileData.mimeType) || part.fileData.mimeType.length > 128) {
                    throw createValidationError(`messages[${i}].parts[${pi}].file mimeType invalid`);
                }
                if (!isNonEmptyString(part.fileData.extension) || part.fileData.extension.length > 32) {
                    throw createValidationError(`messages[${i}].parts[${pi}].file extension invalid`);
                }
                if (!isNonEmptyString(part.fileData.category) || part.fileData.category.length > 32) {
                    throw createValidationError(`messages[${i}].parts[${pi}].file category invalid`);
                }
                if (!Number.isFinite(Number(part.fileData.size)) || Number(part.fileData.size) < 0) {
                    throw createValidationError(`messages[${i}].parts[${pi}].file size invalid`);
                }
                if (!normalizeFileId(part.fileData.fileId)) {
                    throw createValidationError(`messages[${i}].parts[${pi}].file fileId invalid`);
                }
            }
        }

        totalTextChars += normalized.content.length;
        if (normalized.thought) totalTextChars += normalized.thought.length;
        if (totalTextChars > MAX_STORED_TOTAL_TEXT_CHARS) {
            throw createValidationError("messages total text too large");
        }

        sanitized.push(normalized);
    }

    return sanitized;
}

export async function injectCurrentTimeSystemReminder(systemText) {
    if (typeof systemText !== 'string') return systemText;
    if (systemText.includes("<system-reminder>")) return systemText;

    let timeText = "";
    try {
        const formatter = new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const map = {};
        for (const p of parts) map[p.type] = p.value;
        timeText = `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
    } catch {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        timeText = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    const reminder = `\n\n<system-reminder>\n当前时间：${timeText}（时区：Asia/Shanghai）。\n</system-reminder>`;
    return `${systemText}${reminder}`;
}
