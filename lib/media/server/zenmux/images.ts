import { resolveZenMuxProviderConfig } from "@/lib/ai/modelRoutes";
import { IMAGE_MODEL, parseModelSlug, type ImageSize } from "@/lib/media/shared/models";
import { saveImageBuffer, saveMediaFromUrl } from "@/lib/media/storage";

const ZENMUX_VERTEX_BASE_URL = "https://zenmux.ai/api/vertex-ai/v1";

function getAuthHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function readJsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string"
      ? data.error.message
      : (typeof data?.message === "string" ? data.message : `图片服务请求失败（${response.status}）`);
    throw new Error(message);
  }
  return data;
}

async function fileToVertexImage(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  return {
    bytesBase64Encoded: bytes,
    mimeType: file.type || "image/png",
  };
}

function buildParameters(size: ImageSize) {
  const parameters: Record<string, unknown> = {
    sampleCount: 1,
  };

  if (size !== "auto") {
    parameters.size = size;
  }

  return parameters;
}

async function saveImageResult(response: { predictions?: Array<{ bytesBase64Encoded?: string | null; mimeType?: string | null; gcsUri?: string | null; url?: string | null }> }) {
  const item = response.predictions?.[0];
  const b64 = item?.bytesBase64Encoded;
  const remoteUrl = item?.gcsUri || item?.url;
  const mimeType = item?.mimeType || "image/png";

  if (typeof b64 === "string" && b64) {
    const saved = await saveImageBuffer(Buffer.from(b64, "base64"), mimeType);
    return saved.url;
  }

  if (typeof remoteUrl === "string" && remoteUrl) {
    const saved = await saveMediaFromUrl(remoteUrl, mimeType, "media-image");
    return saved.url;
  }

  throw new Error("图片处理失败，未返回有效结果");
}

export async function generateAndStoreImage({
  prompt,
  size = "1024x1024",
  signal,
}: {
  prompt: string;
  size?: ImageSize;
  signal?: AbortSignal;
}) {
  const { apiKey } = resolveZenMuxProviderConfig();
  const { provider, model } = parseModelSlug(IMAGE_MODEL);
  const response = await fetch(`${ZENMUX_VERTEX_BASE_URL}/publishers/${provider}/models/${model}:predict`, {
    method: "POST",
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: buildParameters(size),
    }),
    signal,
  });

  return saveImageResult(await readJsonResponse(response));
}

export async function editAndStoreImage({
  prompt,
  image,
  size = "1024x1024",
  signal,
}: {
  prompt: string;
  image: File;
  size?: ImageSize;
  signal?: AbortSignal;
}) {
  const { apiKey } = resolveZenMuxProviderConfig();
  const { provider, model } = parseModelSlug(IMAGE_MODEL);
  const response = await fetch(`${ZENMUX_VERTEX_BASE_URL}/publishers/${provider}/models/${model}:predict`, {
    method: "POST",
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      instances: [
        {
          prompt,
          image: await fileToVertexImage(image),
        },
      ],
      parameters: buildParameters(size),
    }),
    signal,
  });

  return saveImageResult(await readJsonResponse(response));
}
