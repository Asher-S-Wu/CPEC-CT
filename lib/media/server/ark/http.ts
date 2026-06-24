import { request as httpsRequest } from "node:https";

const ARK_SERVICE_TIMEOUT_MS = 180_000;

type ArkRequestMethod = "GET" | "POST";

function getAuthHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function readJsonResponse(statusCode: number, data: any, serviceName: string) {
  if (statusCode < 200 || statusCode >= 300) {
    const message = typeof data?.error?.message === "string"
      ? data.error.message
      : (typeof data?.message === "string" ? data.message : `${serviceName}服务请求失败（${statusCode}）`);
    throw new Error(message);
  }
  return data;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : "";
  }
  return "";
}

function normalizeArkRequestError(error: unknown, serviceName: string) {
  if (error instanceof Error && error.message === `${serviceName}处理已取消`) {
    return error;
  }

  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : "";

  if (
    message === `${serviceName}服务连接超时，请稍后再试` ||
    message.startsWith(`${serviceName}服务响应超时`)
  ) {
    return new Error(message, { cause: error });
  }

  if (["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) {
    return new Error(`${serviceName}服务网络连接失败，请稍后再试`, { cause: error });
  }

  return new Error(`${serviceName}服务请求失败，请稍后再试`, { cause: error });
}

export function requestArkJson({
  url,
  apiKey,
  method = "POST",
  body,
  signal,
  serviceName,
  timeoutMs = ARK_SERVICE_TIMEOUT_MS,
}: {
  url: string;
  apiKey: string;
  method?: ArkRequestMethod;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
  serviceName: string;
  timeoutMs?: number;
}) {
  const payload = body ? JSON.stringify(body) : "";
  const endpoint = new URL(url);
  const startedAt = Date.now();

  return new Promise<any>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error(`${serviceName}处理已取消`));
      return;
    }

    let finished = false;
    let request: ReturnType<typeof httpsRequest>;
    const cleanup = () => {
      finished = true;
      signal?.removeEventListener("abort", handleAbort);
    };
    const fail = (error: unknown) => {
      if (finished) return;
      cleanup();
      reject(normalizeArkRequestError(error, serviceName));
    };
    const handleAbort = () => {
      fail(new Error(`${serviceName}处理已取消`));
      request.destroy();
    };

    request = httpsRequest(
      {
        method,
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        family: 4,
        port: endpoint.port,
        path: `${endpoint.pathname}${endpoint.search}`,
        headers: {
          ...getAuthHeaders(apiKey),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("error", fail);

        response.on("end", () => {
          if (finished) return;
          cleanup();

          const text = Buffer.concat(chunks).toString("utf8");
          let data: any = {};

          if (text.trim()) {
            try {
              data = JSON.parse(text);
            } catch (error) {
              reject(new Error(`${serviceName}服务返回内容解析失败`, { cause: error }));
              return;
            }
          }

          try {
            resolve(readJsonResponse(response.statusCode || 0, data, serviceName));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", fail);

    request.setTimeout(timeoutMs, () => {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      fail(new Error(`${serviceName}服务响应超时（已等待 ${elapsedSeconds} 秒），请稍后再试`));
      request.destroy();
    });

    signal?.addEventListener("abort", handleAbort, { once: true });
    if (payload) request.write(payload);
    request.end();
  });
}
