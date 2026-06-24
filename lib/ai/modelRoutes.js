const BAILIAN_REGION_HOST = "ap-southeast-1.maas.aliyuncs.com";
const BAILIAN_WORKSPACE_ID = "ws-2t7yj3g991jc5yo6";
const ZENMUX_OPENAI_BASE_URL = "https://zenmux.ai/api/v1";
const ZENMUX_VERTEX_BASE_URL = "https://zenmux.ai/api/vertex-ai";

function readOptionalEnv(name) {
  return process.env[name]?.trim() || "";
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function resolveZenMuxProviderConfig() {
  const apiKey = readRequiredEnv("ZENMUX_API_KEY");

  return {
    apiKey,
    openAIBaseUrl: ZENMUX_OPENAI_BASE_URL,
  };
}

export function resolveZenMuxVertexConfig() {
  const apiKey = readRequiredEnv("ZENMUX_API_KEY");
  const baseUrl = readOptionalEnv("ZENMUX_VERTEX_BASE_URL") || ZENMUX_VERTEX_BASE_URL;

  return {
    apiKey,
    baseUrl,
  };
}

export function resolveBailianProviderConfig() {
  const apiKey = readRequiredEnv("DASHSCOPE_API_KEY");
  const workspaceId = BAILIAN_WORKSPACE_ID;
  const baseUrl = `https://${workspaceId}.${BAILIAN_REGION_HOST}`;

  return {
    apiKey,
    workspaceId,
    baseUrl,
    openAIBaseUrl: `${baseUrl}/compatible-mode/v1`,
    dashScopeBaseUrl: `${baseUrl}/api/v1`,
  };
}

export function resolveBailianDashScopeConfig() {
  return resolveBailianProviderConfig();
}
