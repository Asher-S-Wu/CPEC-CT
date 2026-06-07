import Anthropic from "@anthropic-ai/sdk";

export const MINIMAX_M3_RECOMMENDED_MAX_TOKENS = 131072;

export function createMinimaxAnthropicClient({ baseUrl, apiKey }) {
  return new Anthropic({
    baseURL: baseUrl,
    authToken: apiKey,
  });
}

export function getMinimaxMaxTokens() {
  return MINIMAX_M3_RECOMMENDED_MAX_TOKENS;
}

export function buildMinimaxThinking() {
  return {
    type: "adaptive",
  };
}

export function normalizeAnthropicJsonSchema(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAnthropicJsonSchema(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const next = {};
  for (const [key, raw] of Object.entries(value)) {
    if (key === "type" && typeof raw === "string") {
      next[key] = raw.toLowerCase();
      continue;
    }
    next[key] = normalizeAnthropicJsonSchema(raw);
  }
  return next;
}

export function getAnthropicTextFromContent(content) {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (block?.type === "text" && typeof block.text === "string") return block.text;
      return "";
    })
    .join("")
    .trim();
}

export function normalizeAnthropicSdkError(error) {
  if (error instanceof Anthropic.APIError) {
    const err = new Error(error.message || `模型请求失败（${error.status}）`);
    err.status = error.status;
    err.code = error.code;
    return err;
  }
  return error;
}
