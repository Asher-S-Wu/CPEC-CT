import OpenAI from "openai";
import { resolveArkProviderConfig } from "@/lib/ai/modelRoutes";
import { DOUBAO_SEED_MODEL } from "@/lib/ai/shared/models";

const REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high"]);

export function createArkOpenAIClient() {
  const { openAIBaseUrl, apiKey } = resolveArkProviderConfig();
  return new OpenAI({
    apiKey,
    baseURL: openAIBaseUrl,
  });
}

function normalizeReasoningEffort(value, defaultValue = "high") {
  const effort = typeof value === "string" ? value.trim() : "";
  return REASONING_EFFORTS.has(effort) ? effort : defaultValue;
}

export function buildArkChatCompletionsRequest({
  model = DOUBAO_SEED_MODEL,
  messages,
  system,
  prompt,
  stream = false,
  reasoningEffort = "high",
  tools,
  toolChoice,
  extra = {},
} = {}) {
  const effort = normalizeReasoningEffort(reasoningEffort);
  const requestMessages = [];

  if (typeof system === "string" && system.trim()) {
    requestMessages.push({ role: "system", content: system.trim() });
  }

  if (Array.isArray(messages)) {
    requestMessages.push(...messages);
  } else {
    requestMessages.push({ role: "user", content: String(prompt ?? "") });
  }

  const request = {
    model,
    messages: requestMessages,
    reasoning_effort: effort,
    thinking: {
      type: "enabled",
    },
    ...extra,
  };

  if (stream) {
    request.stream = true;
    request.stream_options = { include_usage: true };
  }
  if (Array.isArray(tools) && tools.length > 0) {
    request.tools = tools;
  }
  if (toolChoice) {
    request.tool_choice = toolChoice;
  }

  return request;
}
