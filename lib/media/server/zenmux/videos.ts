import { resolveZenMuxProviderConfig } from "@/lib/ai/modelRoutes";
import {
  VIDEO_MODEL,
  parseModelSlug,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoPersonGeneration,
  type VideoResolution,
} from "@/lib/media/shared/models";
import { saveMediaFromUrl, saveVideoBuffer } from "@/lib/media/storage";

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
      : (typeof data?.message === "string" ? data.message : `视频服务请求失败（${response.status}）`);
    throw new Error(message);
  }
  return data;
}

function extractVideoPayload(response: Record<string, unknown>) {
  const videos = Array.isArray(response?.videos) ? response.videos : [];
  const first = videos[0];
  if (!first || typeof first !== "object") {
    throw new Error("视频生成失败，未返回有效结果");
  }

  const gcsUri = typeof first.gcsUri === "string" ? first.gcsUri : "";
  const bytesBase64Encoded = typeof first.bytesBase64Encoded === "string" ? first.bytesBase64Encoded : "";
  const mimeType = typeof first.mimeType === "string" ? first.mimeType : "video/mp4";

  return { gcsUri, bytesBase64Encoded, mimeType };
}

function normalizeOptionalText(value?: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function normalizeOptionalNumber(value?: number) {
  return Number.isFinite(value) ? value : undefined;
}

async function fileToVertexImage(file?: File) {
  if (!file) return undefined;
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  return {
    bytesBase64Encoded: bytes,
    mimeType: file.type || "image/png",
  };
}

function getVideoModelUrls() {
  const { provider, model } = parseModelSlug(VIDEO_MODEL);
  return {
    submitUrl: `${ZENMUX_VERTEX_BASE_URL}/publishers/${provider}/models/${model}:predictLongRunning`,
    pollUrl: `${ZENMUX_VERTEX_BASE_URL}/publishers/${provider}/models/${model}:fetchPredictOperation`,
  };
}

async function storeCompletedVideo(latestOperation: Record<string, unknown>) {
  if (latestOperation.error) {
    const message = typeof latestOperation.error === "object" &&
      latestOperation.error &&
      typeof (latestOperation.error as { message?: string }).message === "string"
      ? (latestOperation.error as { message: string }).message
      : "视频生成失败";
    throw new Error(message);
  }

  const raiMediaFilteredCount = Number((latestOperation.response as Record<string, unknown> | undefined)?.raiMediaFilteredCount);
  if (Number.isFinite(raiMediaFilteredCount) && raiMediaFilteredCount > 0) {
    const reasons = (latestOperation.response as { raiMediaFilteredReasons?: unknown[] } | undefined)?.raiMediaFilteredReasons;
    const reasonText = Array.isArray(reasons) ? reasons.map((item) => String(item)).filter(Boolean).join("；") : "";
    throw new Error(reasonText || "视频内容未通过安全审核");
  }

  const response = latestOperation.response;
  if (!response || typeof response !== "object") {
    throw new Error("视频生成失败，未返回有效结果");
  }

  const { gcsUri, bytesBase64Encoded, mimeType } = extractVideoPayload(response as Record<string, unknown>);

  if (bytesBase64Encoded) {
    const saved = await saveVideoBuffer(Buffer.from(bytesBase64Encoded, "base64"), mimeType);
    return saved.url;
  }

  if (gcsUri) {
    const saved = await saveMediaFromUrl(gcsUri, mimeType, "media-video");
    return saved.url;
  }

  throw new Error("视频生成失败，未返回可下载内容");
}

export async function submitVideoGeneration({
  prompt,
  image,
  lastFrame,
  aspectRatio = "16:9",
  durationSeconds = 5,
  resolution = "720p",
  generateAudio = true,
  negativePrompt,
  enhancePrompt,
  personGeneration,
  seed,
  fps,
  sampleCount = 1,
  signal,
}: {
  prompt: string;
  image?: File;
  lastFrame?: File;
  aspectRatio?: VideoAspectRatio;
  durationSeconds?: VideoDuration;
  resolution?: VideoResolution;
  generateAudio?: boolean;
  negativePrompt?: string;
  enhancePrompt?: boolean;
  personGeneration?: VideoPersonGeneration;
  seed?: number;
  fps?: number;
  sampleCount?: number;
  signal?: AbortSignal;
}) {
  const { apiKey } = resolveZenMuxProviderConfig();
  const { submitUrl } = getVideoModelUrls();
  const instance: Record<string, unknown> = {
    prompt,
  };
  const vertexImage = await fileToVertexImage(image);
  const vertexLastFrame = await fileToVertexImage(lastFrame);

  if (vertexImage) {
    instance.image = vertexImage;
  }
  if (vertexLastFrame) {
    instance.lastFrame = vertexLastFrame;
  }

  const parameters: Record<string, unknown> = {
    aspectRatio,
    durationSeconds,
    resolution,
    generateAudio,
    sampleCount,
  };
  const normalizedNegativePrompt = normalizeOptionalText(negativePrompt);
  const normalizedPersonGeneration = normalizeOptionalText(personGeneration);
  const normalizedSeed = normalizeOptionalNumber(seed);
  const normalizedFps = normalizeOptionalNumber(fps);

  if (normalizedNegativePrompt) {
    parameters.negativePrompt = normalizedNegativePrompt;
  }
  if (typeof enhancePrompt === "boolean") {
    parameters.enhancePrompt = enhancePrompt;
  }
  if (normalizedPersonGeneration) {
    parameters.personGeneration = normalizedPersonGeneration;
  }
  if (normalizedSeed !== undefined) {
    parameters.seed = normalizedSeed;
  }
  if (normalizedFps !== undefined) {
    parameters.fps = normalizedFps;
  }

  const submitResponse = await fetch(submitUrl, {
    method: "POST",
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      instances: [instance],
      parameters,
    }),
    signal,
  });

  const submitData = await readJsonResponse(submitResponse);
  const operationName = typeof submitData?.name === "string" ? submitData.name : "";
  if (!operationName) {
    throw new Error("视频生成任务提交失败");
  }

  return { operationName };
}

export async function fetchAndStoreVideoGenerationResult({
  operationName,
  signal,
}: {
  operationName: string;
  signal?: AbortSignal;
}) {
  const { apiKey } = resolveZenMuxProviderConfig();
  const { pollUrl } = getVideoModelUrls();
  const pollResponse = await fetch(pollUrl, {
    method: "POST",
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({ operationName }),
    signal,
  });

  const latestOperation = await readJsonResponse(pollResponse);
  if (latestOperation.done !== true) {
    return { done: false as const };
  }

  const videoUrl = await storeCompletedVideo(latestOperation);
  return { done: true as const, videoUrl };
}
