// === 国产对话模型 ===
export const DOUBAO_SEED_MODEL = "doubao-seed-2-1-pro-260628";
export const GLM_MODEL = "z-ai/glm-5.2";
export const KIMI_MODEL = "moonshotai/kimi-k2.6";
export const QWEN_MODEL = "qwen/qwen3.7-max";
export const DEEPSEEK_V4_PRO_MODEL = "deepseek/deepseek-v4-pro";

export const CHAT_RUNTIME_MODE_CHAT = "chat";
export const DEFAULT_CHAT_RUNTIME_MODE = CHAT_RUNTIME_MODE_CHAT;

export const MODEL_GROUP_ORDER = ["bytedance", "z-ai", "moonshotai", "qwen", "deepseek"];

export const MODEL_GROUP_TITLES = Object.freeze({
  bytedance: "火山方舟",
  "z-ai": "Z.AI",
  moonshotai: "Moonshot AI",
  qwen: "Qwen",
  deepseek: "DeepSeek",
});

const CHAT_MODEL_DEFINITIONS = Object.freeze([
  {
    id: DOUBAO_SEED_MODEL,
    name: "Doubao Seed 2.1 Pro",
    provider: "bytedance",
    contextWindow: 256000,
    nativeInputs: ["text", "image", "file"],
    supportsWebSearch: true,
    supportsAgentRuntime: false,
    supportsPlanning: false,
    supportsToolUse: true,
    supportsApprovalFlow: false,
    supportsMemory: false,
    supportsThinkingLevelControl: false,
    supportsMaxTokensControl: false,
  },
  {
    id: GLM_MODEL,
    name: "GLM 5.2",
    provider: "z-ai",
    contextWindow: 200000,
    nativeInputs: ["text", "image", "file"],
    supportsWebSearch: true,
    supportsAgentRuntime: false,
    supportsPlanning: false,
    supportsToolUse: true,
    supportsApprovalFlow: false,
    supportsMemory: false,
    supportsThinkingLevelControl: false,
    supportsMaxTokensControl: false,
  },
  {
    id: KIMI_MODEL,
    name: "Kimi K2.6",
    provider: "moonshotai",
    contextWindow: 256000,
    nativeInputs: ["text", "file"],
    supportsWebSearch: true,
    supportsAgentRuntime: false,
    supportsPlanning: false,
    supportsToolUse: true,
    supportsApprovalFlow: false,
    supportsMemory: false,
    supportsThinkingLevelControl: false,
    supportsMaxTokensControl: false,
  },
  {
    id: QWEN_MODEL,
    name: "Qwen3.7-Max",
    provider: "qwen",
    contextWindow: 256000,
    nativeInputs: ["text", "file"],
    supportsWebSearch: true,
    supportsAgentRuntime: false,
    supportsPlanning: false,
    supportsToolUse: true,
    supportsApprovalFlow: false,
    supportsMemory: false,
    supportsThinkingLevelControl: false,
    supportsMaxTokensControl: false,
  },
  {
    id: DEEPSEEK_V4_PRO_MODEL,
    name: "DeepSeek V4 Pro",
    provider: "deepseek",
    contextWindow: 128000,
    nativeInputs: ["text", "file"],
    supportsWebSearch: true,
    supportsAgentRuntime: false,
    supportsPlanning: false,
    supportsToolUse: true,
    supportsApprovalFlow: false,
    supportsMemory: false,
    supportsThinkingLevelControl: false,
    supportsMaxTokensControl: false,
  },
]);

const LEGACY_TEXT_MODEL = ["Mini", "Max-M3"].join("");
const LEGACY_IMAGE_MODEL = ["image", "01"].join("-");
const LEGACY_QWEN_MODEL = "qwen3.7-plus";
const LEGACY_WAN_MODEL = "wan2.7-image-pro";

const LEGACY_MODEL_IDS = new Set([
  LEGACY_TEXT_MODEL,
  LEGACY_IMAGE_MODEL,
  LEGACY_QWEN_MODEL,
  LEGACY_WAN_MODEL,
]);

function createChatModelConfig(model) {
  const nativeInputs = Object.freeze(
    Array.isArray(model?.nativeInputs) && model.nativeInputs.length > 0
      ? Array.from(new Set(
        model.nativeInputs
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      ))
      : ["text"]
  );

  return Object.freeze({
    ...model,
    nativeInputs,
    supportsImages: nativeInputs.includes("image"),
    supportsDocuments: nativeInputs.includes("file"),
  });
}

export const CHAT_MODELS = Object.freeze(CHAT_MODEL_DEFINITIONS.map(createChatModelConfig));

export const PRIMARY_CHAT_MODELS = Object.freeze(CHAT_MODELS);
const PRIMARY_CHAT_MODEL_IDS = new Set(PRIMARY_CHAT_MODELS.map((model) => model.id));
const ARK_CHAT_MODEL_IDS = new Set([DOUBAO_SEED_MODEL]);
const ZENMUX_CHAT_MODEL_IDS = new Set([
  GLM_MODEL,
  KIMI_MODEL,
  QWEN_MODEL,
  DEEPSEEK_V4_PRO_MODEL,
]);

export const DEFAULT_MODEL = DOUBAO_SEED_MODEL;

export const DEFAULT_THINKING_LEVELS = Object.freeze(
  CHAT_MODELS.reduce((acc, model) => {
    if (model.defaultThinkingLevel) {
      acc[model.id] = model.defaultThinkingLevel;
    }
    return acc;
  }, {})
);

export function normalizeModelId(model) {
  if (typeof model !== "string") return model;
  const normalized = model.trim();
  if (LEGACY_MODEL_IDS.has(normalized)) return DEFAULT_MODEL;
  return normalized;
}

export function isZenMuxChatModel(model) {
  const normalized = normalizeModelId(model);
  return typeof normalized === "string" && ZENMUX_CHAT_MODEL_IDS.has(normalized);
}

export function isArkChatModel(model) {
  const normalized = normalizeModelId(model);
  return typeof normalized === "string" && ARK_CHAT_MODEL_IDS.has(normalized);
}

export function getModelConfig(modelId) {
  const normalized = normalizeModelId(modelId);
  return CHAT_MODELS.find((model) => model.id === normalized) || null;
}

export function getModelProvider(modelId) {
  return getModelConfig(modelId)?.provider || "";
}

export function isPrimaryChatModelId(modelId) {
  const normalized = normalizeModelId(modelId);
  return typeof normalized === "string" && PRIMARY_CHAT_MODEL_IDS.has(normalized);
}

export function getSelectableChatModels() {
  return PRIMARY_CHAT_MODELS;
}

export function getGroupedSelectableModels() {
  const models = getSelectableChatModels();
  const grouped = new Map();
  for (const provider of MODEL_GROUP_ORDER) {
    const items = models.filter((m) => m.provider === provider);
    if (items.length > 0) {
      grouped.set(provider, items);
    }
  }
  for (const m of models) {
    if (!MODEL_GROUP_ORDER.includes(m.provider)) {
      if (!grouped.has(m.provider)) grouped.set(m.provider, []);
      grouped.get(m.provider).push(m);
    }
  }
  return grouped;
}

export function getDefaultThinkingLevel(modelId) {
  return DEFAULT_THINKING_LEVELS[normalizeModelId(modelId)];
}

export function normalizeChatRuntimeMode(mode) {
  return CHAT_RUNTIME_MODE_CHAT;
}

function getModelNativeInputs(modelId) {
  return getModelConfig(modelId)?.nativeInputs || ["text"];
}

function modelSupportsNativeInput(modelId, inputType) {
  const normalizedInput = typeof inputType === "string" ? inputType.trim() : "";
  if (!normalizedInput) return false;
  return getModelNativeInputs(modelId).includes(normalizedInput);
}

function getModelAvailableInputs(modelId) {
  const availableInputs = ["text"];

  if (modelSupportsNativeInput(modelId, "image")) {
    availableInputs.push("image");
  }

  if (modelSupportsNativeInput(modelId, "video")) {
    availableInputs.push("video");
  }

  if (modelSupportsNativeInput(modelId, "audio")) {
    availableInputs.push("audio");
  }

  if (modelSupportsNativeInput(modelId, "file")) {
    availableInputs.push("file");
  }

  return availableInputs;
}

export function modelSupportsAvailableInput(modelId, inputType) {
  const normalizedInput = typeof inputType === "string" ? inputType.trim() : "";
  if (!normalizedInput) return false;
  return getModelAvailableInputs(modelId).includes(normalizedInput);
}

export function getModelAttachmentSupport(modelId) {
  const supportsImages = modelSupportsAvailableInput(modelId, "image");
  const supportsDocuments = modelSupportsAvailableInput(modelId, "file");
  const supportsVideo = modelSupportsAvailableInput(modelId, "video");
  const supportsAudio = modelSupportsAvailableInput(modelId, "audio");

  return {
    supportsImages,
    supportsDocuments,
    supportsVideo,
    supportsAudio,
    supportsFilePicker: supportsImages || supportsDocuments || supportsVideo || supportsAudio,
  };
}

export function getDefaultMaxTokensForModel(modelId) {
  const normalized = normalizeModelId(modelId);
  if (typeof normalized !== "string" || !normalized) return 64000;
  return 64000;
}
