import OpenAI from "openai";
import { resolveZenMuxProviderConfig } from "@/lib/ai/modelRoutes";
import { DEFAULT_MODEL } from "@/lib/ai/shared/models";

const REASONING_EFFORTS = new Set(["none", "minimal", "low", "medium", "high"]);

export function createZenMuxOpenAIClient() {
  const { openAIBaseUrl, apiKey } = resolveZenMuxProviderConfig();
  return new OpenAI({
    apiKey,
    baseURL: openAIBaseUrl,
  });
}

function normalizeReasoningEffort(value, defaultValue = "high") {
  const effort = typeof value === "string" ? value.trim() : "";
  return REASONING_EFFORTS.has(effort) ? effort : defaultValue;
}

/**
 * @param {Record<string, any>} [input]
 */
export function buildResponsesRequest({
  model = DEFAULT_MODEL,
  input,
  instructions,
  previousResponseId,
  stream = false,
  store = true,
  reasoningEffort = "high",
  tools,
  toolChoice,
  extra = {},
} = {}) {
  const request = {
    model,
    input: Array.isArray(input) ? input : String(input ?? ""),
    store,
    reasoning: {
      effort: normalizeReasoningEffort(reasoningEffort),
    },
    ...extra,
  };

  if (typeof instructions === "string" && instructions.trim()) {
    request.instructions = instructions.trim();
  }
  if (typeof previousResponseId === "string" && previousResponseId.trim()) {
    request.previous_response_id = previousResponseId.trim();
  }
  if (stream) {
    request.stream = true;
  }
  if (Array.isArray(tools) && tools.length > 0) {
    request.tools = tools;
  }
  if (toolChoice) {
    request.tool_choice = toolChoice;
  }

  return request;
}

/**
 * @param {Record<string, any>} [input]
 */
export async function requestZenMuxResponse({
  system,
  prompt,
  model = DEFAULT_MODEL,
  signal,
  reasoningEffort = "high",
  tools,
  extra = {},
} = {}) {
  const client = createZenMuxOpenAIClient();

  return client.responses.create(
    buildResponsesRequest({
      model,
      instructions: system,
      input: [{ role: "user", content: String(prompt ?? "") }],
      stream: false,
      reasoningEffort,
      tools,
      extra,
    }),
    { signal }
  );
}

/**
 * @param {Record<string, any>} [input]
 */
export async function requestZenMuxChatCompletion(input = {}) {
  const response = await requestZenMuxResponse(input);
  return getResponsesOutputText(response);
}

function getMessageContentText(item) {
  if (!item || item.type !== "message") return "";
  const content = item.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      return "";
    })
    .join("");
}

export function getResponsesOutputText(response) {
  if (typeof response?.output_text === "string") {
    return response.output_text.trim();
  }
  const output = Array.isArray(response?.output) ? response.output : [];
  return output
    .map((item) => getMessageContentText(item))
    .join("")
    .trim();
}

export function getResponsesOutputItems(response) {
  return Array.isArray(response?.output) ? response.output : [];
}

export function getResponsesCompletedUsage(eventOrResponse) {
  const response = eventOrResponse?.response || eventOrResponse;
  return response?.usage && typeof response.usage === "object" ? response.usage : null;
}

export function normalizeOpenAIError(error) {
  if (error instanceof OpenAI.APIError) {
    const err = new Error(error.message || `模型请求失败（${error.status}）`);
    err.status = error.status;
    err.code = error.code;
    return err;
  }
  return error;
}
