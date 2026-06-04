// MiniMax 官方国内版平台：文字模型走 Anthropic SDK 兼容入口，图像仍走原生 v1 入口。
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_ANTHROPIC_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_NATIVE_BASE_URL = "https://api.minimaxi.com/v1";

export function resolveMinimaxProviderConfig() {
  if (!MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY is not set");
  }
  return {
    baseUrl: MINIMAX_ANTHROPIC_BASE_URL,
    apiKey: MINIMAX_API_KEY,
  };
}

// 图像生成使用 MiniMax 原生 v1 接口。
export function resolveMinimaxImageProviderConfig() {
  if (!MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY is not set");
  }
  return {
    baseUrl: MINIMAX_NATIVE_BASE_URL,
    apiKey: MINIMAX_API_KEY,
  };
}
