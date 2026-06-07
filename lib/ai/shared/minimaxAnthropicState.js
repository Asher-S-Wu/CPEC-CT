export const MINIMAX_ANTHROPIC_STATE_KEY = "minimaxAnthropic";

const CACHE_CONTROL = Object.freeze({ type: "ephemeral" });
const SYSTEM_REMINDER_OPEN = "<system-reminder>";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 8) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value == null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJsonValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return undefined;

  const next = {};
  for (const [key, item] of Object.entries(value)) {
    const sanitized = sanitizeJsonValue(item, depth + 1);
    if (sanitized !== undefined) next[key] = sanitized;
  }
  return next;
}

export function sanitizeMinimaxAnthropicContentBlocks(content) {
  if (!Array.isArray(content)) return undefined;

  const blocks = content
    .map((block) => sanitizeJsonValue(block))
    .filter((block) => isPlainObject(block) && isNonEmptyString(block.type));

  return blocks.length > 0 ? blocks : undefined;
}

export function getMinimaxAnthropicContentBlocks(providerState) {
  const state = providerState?.[MINIMAX_ANTHROPIC_STATE_KEY];
  return sanitizeMinimaxAnthropicContentBlocks(state?.content);
}

export function buildMinimaxAnthropicProviderState(content, usage) {
  const blocks = sanitizeMinimaxAnthropicContentBlocks(content);
  if (!blocks) return undefined;

  const state = { content: blocks };
  const safeUsage = sanitizeJsonValue(usage);
  if (isPlainObject(safeUsage)) state.usage = safeUsage;
  return { [MINIMAX_ANTHROPIC_STATE_KEY]: state };
}

export function normalizeMinimaxProviderState(providerState) {
  const blocks = getMinimaxAnthropicContentBlocks(providerState);
  if (!blocks) return undefined;

  const next = { [MINIMAX_ANTHROPIC_STATE_KEY]: { content: blocks } };
  const usage = sanitizeJsonValue(providerState?.[MINIMAX_ANTHROPIC_STATE_KEY]?.usage);
  if (isPlainObject(usage)) {
    next[MINIMAX_ANTHROPIC_STATE_KEY].usage = usage;
  }
  return next;
}

export function splitMinimaxSystemReminder(systemText) {
  const raw = typeof systemText === "string" ? systemText : "";
  const markerIndex = raw.indexOf(SYSTEM_REMINDER_OPEN);
  if (markerIndex < 0) {
    return {
      stableSystemText: raw.trim(),
      volatileReminderText: "",
    };
  }

  const reminderStart = raw.lastIndexOf("\n\n", markerIndex);
  const splitIndex = reminderStart >= 0 ? reminderStart : markerIndex;
  return {
    stableSystemText: raw.slice(0, splitIndex).trim(),
    volatileReminderText: raw.slice(splitIndex).trim(),
  };
}

function cloneContentBlock(block) {
  const sanitized = sanitizeJsonValue(block);
  return isPlainObject(sanitized) ? sanitized : null;
}

function toContentBlocks(content) {
  if (typeof content === "string") {
    return isNonEmptyString(content) ? [{ type: "text", text: content }] : [];
  }
  if (Array.isArray(content)) {
    return content.map(cloneContentBlock).filter(Boolean);
  }
  return [];
}

function findLastCacheableBlockIndex(blocks) {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const type = blocks[index]?.type;
    if (type === "text" || type === "tool_use" || type === "tool_result" || type === "thinking") {
      return index;
    }
  }
  return -1;
}

function addCacheControlToContent(content) {
  const blocks = toContentBlocks(content);
  const targetIndex = findLastCacheableBlockIndex(blocks);
  if (targetIndex < 0) return { content, changed: false };

  blocks[targetIndex] = {
    ...blocks[targetIndex],
    cache_control: CACHE_CONTROL,
  };
  return { content: blocks, changed: true };
}

function appendTextBlockToMessage(message, text) {
  if (!isNonEmptyString(text)) return message;
  const blocks = toContentBlocks(message.content);
  blocks.push({ type: "text", text });
  return { ...message, content: blocks };
}

export function buildMinimaxAnthropicRequest({ systemText, messages, cacheLastMessage = true }) {
  const { stableSystemText, volatileReminderText } = splitMinimaxSystemReminder(systemText);
  const request = {};

  if (isNonEmptyString(stableSystemText)) {
    request.system = [
      {
        type: "text",
        text: stableSystemText,
        cache_control: CACHE_CONTROL,
      },
    ];
  }

  const nextMessages = Array.isArray(messages)
    ? messages.map((message) => ({ ...message }))
    : [];

  if (cacheLastMessage) {
    for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
      const { content, changed } = addCacheControlToContent(nextMessages[index].content);
      if (changed) {
        nextMessages[index] = { ...nextMessages[index], content };
        break;
      }
    }
  }

  if (isNonEmptyString(volatileReminderText) && nextMessages.length > 0) {
    const targetIndex = nextMessages.length - 1;
    nextMessages[targetIndex] = appendTextBlockToMessage(nextMessages[targetIndex], volatileReminderText);
  }

  request.messages = nextMessages;
  return request;
}

export function addMinimaxCacheControlToLastTool(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return tools;
  return tools.map((tool, index) => (
    index === tools.length - 1
      ? { ...tool, cache_control: CACHE_CONTROL }
      : { ...tool }
  ));
}
