const BAILIAN_REGION_HOST = "ap-southeast-1.maas.aliyuncs.com";
const BAILIAN_WORKSPACE_ID = "ws-2t7yj3g991jc5yo6";
import { getEnv } from "@/lib/env";

export function resolveBailianProviderConfig() {
  const apiKey = getEnv().dashscopeApiKey;
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
