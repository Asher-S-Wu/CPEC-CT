import { randomUUID } from "node:crypto";
import {
  buildChatCompletionsRequest,
  createZenMuxOpenAIClient,
  getChatCompletionMessage,
  getChatCompletionOutputText,
  getChatCompletionToolCalls,
  normalizeOpenAIError,
} from "@/lib/ai/server/zenmux/openai";

type AgentPart = {
  text?: string;
  functionCall?: {
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    id?: string;
    response: Record<string, unknown>;
  };
};

type AgentContent = {
  role: "user" | "model";
  parts: AgentPart[];
  reasoning?: string;
  reasoningDetails?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonSchema(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const next: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (key === "type" && typeof raw === "string") {
      next[key] = raw.toLowerCase();
      continue;
    }
    next[key] = normalizeJsonSchema(raw);
  }
  return next;
}

function agentContentsToChatMessages(contents: AgentContent[]) {
  const messages: Array<Record<string, unknown>> = [];

  for (const content of contents) {
    const parts = Array.isArray(content?.parts) ? content.parts : [];

    if (content.role === "model") {
      const text = parts
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .filter(Boolean)
        .join("\n");
      const toolCalls = parts
        .filter((part) => part.functionCall && typeof part.functionCall.name === "string")
        .map((part) => ({
          id: String(part.functionCall?.id || randomUUID()),
          type: "function",
          function: {
            name: String(part.functionCall?.name),
            arguments: JSON.stringify(isPlainObject(part.functionCall?.args) ? part.functionCall?.args : {}),
          },
        }));
      if (text) {
        messages.push({
          role: "assistant",
          content: text,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          ...(typeof content.reasoning === "string" && content.reasoning ? { reasoning: content.reasoning } : {}),
          ...(Array.isArray(content.reasoningDetails) ? { reasoning_details: content.reasoningDetails } : {}),
        });
      } else if (toolCalls.length > 0) {
        messages.push({
          role: "assistant",
          content: "",
          tool_calls: toolCalls,
          ...(typeof content.reasoning === "string" && content.reasoning ? { reasoning: content.reasoning } : {}),
          ...(Array.isArray(content.reasoningDetails) ? { reasoning_details: content.reasoningDetails } : {}),
        });
      }
      continue;
    }

    const functionResponses = parts.filter((part) => part.functionResponse);
    if (functionResponses.length > 0) {
      for (const part of functionResponses) {
        const response = part.functionResponse;
        messages.push({
          role: "tool",
          tool_call_id: String(response?.id || ""),
          name: String(response?.name || ""),
          content: JSON.stringify(response?.response ?? {}),
        });
      }
      const text = parts
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .filter(Boolean)
        .join("\n");
      if (text) {
        messages.push({ role: "user", content: text });
      }
      continue;
    }

    const textPieces = parts
      .filter((part) => typeof part.text === "string" && part.text.trim())
      .map((part) => part.text as string);
    if (textPieces.length > 0) {
      messages.push({ role: "user", content: textPieces.join("\n") });
    }
  }

  return messages;
}

function agentToolsToOpenAITools(
  tools?: Array<{ functionDeclarations: Array<Record<string, unknown>> }>
) {
  if (!Array.isArray(tools)) return undefined;
  const declarations = tools.flatMap((tool) => (Array.isArray(tool.functionDeclarations) ? tool.functionDeclarations : []));
  if (declarations.length === 0) return undefined;

  return declarations.map((decl) => ({
    type: "function",
    function: {
      name: String(decl.name),
      description: typeof decl.description === "string" ? decl.description : "",
      parameters: normalizeJsonSchema(
        (decl.parameters as Record<string, unknown>) || { type: "object", properties: {} }
      ),
    },
  }));
}

export async function callZenMuxAgent(input: {
  apiKey: string;
  model: string;
  contents: AgentContent[];
  tools?: Array<{ functionDeclarations: Array<Record<string, unknown>> }>;
}) {
  const messages = agentContentsToChatMessages(input.contents);
  const tools = agentToolsToOpenAITools(input.tools);
  const client = createZenMuxOpenAIClient();

  try {
    return (await client.chat.completions.create(
      buildChatCompletionsRequest({
        model: input.model,
        messages,
        stream: false,
        tools,
        reasoningEffort: "high",
      }) as any
    )) as unknown as Record<string, unknown>;
  } catch (error) {
    const normalized = normalizeOpenAIError(error);
    if (normalized instanceof Error) {
      normalized.message = normalized.message.slice(0, 500);
    }
    throw normalized;
  }
}

export function extractZenMuxText(response: any) {
  return getChatCompletionOutputText(response);
}

export function extractZenMuxFunctionCalls(response: any) {
  return getChatCompletionToolCalls(response)
    .filter((item: any) => item?.type === "function" && typeof item?.function?.name === "string")
    .map((item: any) => {
      const rawArgs = typeof item?.function?.arguments === "string" ? item.function.arguments : "{}";
      let args: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(rawArgs);
        if (isPlainObject(parsed)) args = parsed;
      } catch {
        args = {};
      }
      return {
        id: String(item.id || randomUUID()),
        name: String(item.function.name),
        args,
      };
    });
}

export function extractModelContent(response: any): AgentContent {
  const parts: AgentPart[] = [];
  const message = getChatCompletionMessage(response);
  const text = getChatCompletionOutputText(response);
  if (text) {
    parts.push({ text });
  }

  const calls = extractZenMuxFunctionCalls(response);
  for (const call of calls) {
    parts.push({ functionCall: call });
  }

  return {
    role: "model",
    parts,
    reasoning: typeof message?.reasoning === "string" ? message.reasoning : undefined,
    reasoningDetails: Array.isArray(message?.reasoning_details) ? message.reasoning_details : undefined,
  };
}

export function appendFunctionResults(input: {
  contents: AgentContent[];
  modelContent: AgentContent;
  results: Array<{
    id: string;
    name: string;
    result: Record<string, unknown>;
  }>;
}) {
  const textParts = input.modelContent.parts.filter((part) => typeof part.text === "string" && part.text);
  const calls = input.modelContent.parts.filter((part) => part.functionCall);
  const modelParts = [...textParts, ...calls];
  if (modelParts.length > 0) {
    input.contents.push({
      role: "model",
      parts: modelParts,
      reasoning: input.modelContent.reasoning,
      reasoningDetails: input.modelContent.reasoningDetails,
    });
  }

  for (const result of input.results) {
    input.contents.push({
      role: "user",
      parts: [{
        functionResponse: {
          name: result.name,
          id: result.id,
          response: {
            result: result.result,
          },
        },
      }],
    });
  }
}
