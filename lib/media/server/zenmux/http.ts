const SERVICE_TIMEOUT_MS = 180_000;

function readErrorMessage(data: unknown, serviceName: string, status: number) {
  if (typeof data === "object" && data) {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "object" && record.error) {
      const message = (record.error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
  }
  return `${serviceName}服务请求失败（${status}）`;
}

export function parseModelId(model: string) {
  const slash = model.indexOf("/");
  if (slash <= 0 || slash === model.length - 1) {
    throw new Error("模型配置无效");
  }

  return {
    provider: model.slice(0, slash),
    modelName: model.slice(slash + 1),
  };
}

export function buildModelEndpoint(
  baseUrl: string,
  model: string,
  action: "predict" | "predictLongRunning" | "fetchPredictOperation"
) {
  const { provider, modelName } = parseModelId(model);
  return `${baseUrl}/v1/publishers/${provider}/models/${modelName}:${action}`;
}

export async function requestZenMuxVertexJson({
  url,
  apiKey,
  body,
  signal,
  serviceName,
  timeoutMs = SERVICE_TIMEOUT_MS,
}: {
  url: string;
  apiKey: string;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
  serviceName: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let data: unknown = {};

    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error(`${serviceName}服务返回内容解析失败`, { cause: error });
      }
    }

    if (!response.ok) {
      throw new Error(readErrorMessage(data, serviceName, response.status));
    }

    return data as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (signal?.aborted) {
        throw new Error(`${serviceName}处理已取消`);
      }
      throw new Error(`${serviceName}服务响应超时，请稍后再试`);
    }
    if (error instanceof Error) throw error;
    throw new Error(`${serviceName}服务请求失败，请稍后再试`);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}
