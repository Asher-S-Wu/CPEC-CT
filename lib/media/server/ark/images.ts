import { request as httpsRequest } from "node:https";
import { resolveArkProviderConfig } from "@/lib/ai/modelRoutes";
import { IMAGE_MODEL, type ImageSize } from "@/lib/media/shared/models";
import { saveImageBuffer, saveMediaFromUrl } from "@/lib/media/storage";

const IMAGE_SERVICE_TIMEOUT_MS = 180_000;

function getAuthHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function readJsonResponse(statusCode: number, data: any) {
  if (statusCode < 200 || statusCode >= 300) {
    const message = typeof data?.error?.message === "string"
      ? data.error.message
      : (typeof data?.message === "string" ? data.message : `图片服务请求失败（${statusCode}）`);
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

function normalizeArkRequestError(error: unknown) {
  if (error instanceof Error && error.message === "图片处理已取消") {
    return error;
  }

  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : "";

  if (message === "图片服务连接超时，请稍后再试") {
    return new Error(message, { cause: error });
  }

  if (["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) {
    return new Error("图片服务网络连接失败，请稍后再试", { cause: error });
  }

  return new Error("图片服务请求失败，请稍后再试", { cause: error });
}

function postArkJson({
  url,
  apiKey,
  body,
  signal,
}: {
  url: string;
  apiKey: string;
  body: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  const payload = JSON.stringify(body);
  const endpoint = new URL(url);

  return new Promise<any>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("图片处理已取消"));
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
      reject(error);
    };
    const handleAbort = () => {
      fail(new Error("图片处理已取消"));
      request.destroy();
    };

    request = httpsRequest(
      {
        method: "POST",
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: `${endpoint.pathname}${endpoint.search}`,
        headers: {
          ...getAuthHeaders(apiKey),
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("error", (error) => {
          fail(normalizeArkRequestError(error));
        });

        response.on("end", () => {
          if (finished) return;
          cleanup();

          const text = Buffer.concat(chunks).toString("utf8");
          let data: any = {};

          if (text.trim()) {
            try {
              data = JSON.parse(text);
            } catch (error) {
              reject(new Error("图片服务返回内容解析失败", { cause: error }));
              return;
            }
          }

          try {
            resolve(readJsonResponse(response.statusCode || 0, data));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", (error) => {
      fail(normalizeArkRequestError(error));
    });

    request.setTimeout(IMAGE_SERVICE_TIMEOUT_MS, () => {
      fail(new Error("图片服务连接超时，请稍后再试"));
      request.destroy();
    });

    signal?.addEventListener("abort", handleAbort, { once: true });
    request.write(payload);
    request.end();
  });
}

async function fileToDataUrl(file: File) {
  const mimeType = file.type || "image/png";
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${mimeType};base64,${bytes}`;
}

async function saveImageResult(response: { data?: Array<{ url?: string | null; b64_json?: string | null }> }) {
  const item = response.data?.[0];
  const remoteUrl = item?.url;
  const b64 = item?.b64_json;

  if (typeof b64 === "string" && b64) {
    const saved = await saveImageBuffer(Buffer.from(b64, "base64"), "image/png");
    return saved.url;
  }

  if (typeof remoteUrl === "string" && remoteUrl) {
    const saved = await saveMediaFromUrl(remoteUrl, "image/png", "media-image");
    return saved.url;
  }

  throw new Error("图片处理失败，未返回有效结果");
}

export async function generateAndStoreImage({
  prompt,
  size = "1920x1920",
  signal,
}: {
  prompt: string;
  size?: ImageSize;
  signal?: AbortSignal;
}) {
  const { apiKey, openAIBaseUrl } = resolveArkProviderConfig();
  const response = await postArkJson({
    url: `${openAIBaseUrl}/images/generations`,
    apiKey,
    body: {
      model: IMAGE_MODEL,
      prompt,
      size,
      response_format: "url",
      watermark: false,
    },
    signal,
  });

  return saveImageResult(response);
}

export async function editAndStoreImage({
  prompt,
  image,
  size = "1920x1920",
  signal,
}: {
  prompt: string;
  image: File;
  size?: ImageSize;
  signal?: AbortSignal;
}) {
  const { apiKey, openAIBaseUrl } = resolveArkProviderConfig();
  const response = await postArkJson({
    url: `${openAIBaseUrl}/images/generations`,
    apiKey,
    body: {
      model: IMAGE_MODEL,
      prompt,
      image: await fileToDataUrl(image),
      size,
      response_format: "url",
      watermark: false,
    },
    signal,
  });

  return saveImageResult(response);
}
