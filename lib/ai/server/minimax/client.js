import { resolveMinimaxProviderConfig } from "@/lib/ai/modelRoutes";
import { MINIMAX_M3_MODEL } from "@/lib/ai/shared/models";
import {
  buildMinimaxThinking,
  createMinimaxAnthropicClient,
  getMinimaxMaxTokens,
  getAnthropicTextFromContent,
  normalizeAnthropicSdkError,
} from "@/lib/ai/server/minimax/anthropic";

/**
 * 通过 MiniMax Anthropic 兼容接口调用 MiniMax-M3 进行一次非流式补全。
 * 供对话压缩、字幕翻译、数据采集智能体等后端复用。
 *
 * @param {object} opts
 * @param {string} [opts.system] 系统提示
 * @param {string} opts.prompt 用户输入
 * @param {string} [opts.model] 模型 ID，默认 MiniMax-M3
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<string>} 模型输出文本
 */
export async function requestMinimaxCompletion({
  system,
  prompt,
  model = MINIMAX_M3_MODEL,
  signal,
} = {}) {
  const { baseUrl, apiKey } = resolveMinimaxProviderConfig();
  const client = createMinimaxAnthropicClient({ baseUrl, apiKey });

  try {
    const response = await client.messages.create(
      {
        model,
        ...(typeof system === "string" && system.trim() ? { system } : {}),
        messages: [{ role: "user", content: String(prompt ?? "") }],
        max_tokens: getMinimaxMaxTokens(),
        thinking: buildMinimaxThinking(),
        temperature: 1,
      },
      { signal }
    );

    return getAnthropicTextFromContent(response?.content);
  } catch (error) {
    throw normalizeAnthropicSdkError(error);
  }
}
