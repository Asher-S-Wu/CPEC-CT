import { resolveZenMuxVertexConfig } from "@/lib/ai/modelRoutes";
import { buildModelEndpoint, requestZenMuxVertexJson } from "@/lib/media/server/zenmux/http";
import {
  VIDEO_MODEL,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
} from "@/lib/media/shared/models";
import { saveMediaFromUrl, saveVideoBuffer } from "@/lib/media/storage";

const VIDEO_SUBMIT_TIMEOUT_MS = 10 * 60 * 1000;

async function fileToVertexImage(file: File) {
  const mimeType = file.type || "image/png";
  const bytesBase64Encoded = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { bytesBase64Encoded, mimeType };
}

function buildVideoParameters({
  aspectRatio,
  durationSeconds,
  resolution,
  generateAudio,
}: {
  aspectRatio: VideoAspectRatio;
  durationSeconds: VideoDuration;
  resolution: VideoResolution;
  generateAudio: boolean;
}) {
  const parameters: Record<string, unknown> = {
    aspectRatio,
    resolution,
    generateAudio,
  };

  if (durationSeconds !== -1) {
    parameters.durationSeconds = durationSeconds;
  }

  return parameters;
}

function getOperationErrorMessage(operation: Record<string, unknown>) {
  if (typeof operation.error === "object" && operation.error) {
    const message = (operation.error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }

  const response = operation.response;
  if (typeof response === "object" && response) {
    const reasons = (response as { raiMediaFilteredReasons?: unknown }).raiMediaFilteredReasons;
    if (Array.isArray(reasons) && typeof reasons[0] === "string" && reasons[0].trim()) {
      return reasons[0].trim();
    }
  }

  return "视频生成失败";
}

async function saveVideoResult(videos: unknown) {
  if (!Array.isArray(videos) || !videos.length) {
    throw new Error("视频生成失败，未返回可下载内容");
  }

  const item = videos[0] as Record<string, unknown>;
  const b64 = typeof item.bytesBase64Encoded === "string" ? item.bytesBase64Encoded : "";
  const mimeType = typeof item.mimeType === "string" && item.mimeType ? item.mimeType : "video/mp4";
  const gcsUri = typeof item.gcsUri === "string" ? item.gcsUri : "";

  if (b64) {
    const saved = await saveVideoBuffer(Buffer.from(b64, "base64"), mimeType);
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
  signal,
}: {
  prompt: string;
  image?: File;
  lastFrame?: File;
  aspectRatio?: VideoAspectRatio;
  durationSeconds?: VideoDuration;
  resolution?: VideoResolution;
  generateAudio?: boolean;
  signal?: AbortSignal;
}) {
  const { apiKey, baseUrl } = resolveZenMuxVertexConfig();
  const instance: Record<string, unknown> = {};

  const text = typeof prompt === "string" ? prompt.trim() : "";
  if (text) instance.prompt = text;
  if (image) instance.image = await fileToVertexImage(image);
  if (lastFrame) instance.lastFrame = await fileToVertexImage(lastFrame);

  const data = await requestZenMuxVertexJson({
    url: buildModelEndpoint(baseUrl, VIDEO_MODEL, "predictLongRunning"),
    apiKey,
    body: {
      instances: [instance],
      parameters: buildVideoParameters({
        aspectRatio,
        durationSeconds,
        resolution,
        generateAudio,
      }),
    },
    signal,
    serviceName: "视频",
    timeoutMs: VIDEO_SUBMIT_TIMEOUT_MS,
  });

  const operationName = typeof data.name === "string" ? data.name.trim() : "";
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
  const { apiKey, baseUrl } = resolveZenMuxVertexConfig();
  const operation = await requestZenMuxVertexJson({
    url: buildModelEndpoint(baseUrl, VIDEO_MODEL, "fetchPredictOperation"),
    apiKey,
    body: { operationName },
    signal,
    serviceName: "视频",
  });

  if (operation.done !== true) {
    return { done: false as const };
  }

  if (operation.error) {
    throw new Error(getOperationErrorMessage(operation));
  }

  const response = typeof operation.response === "object" && operation.response
    ? operation.response as Record<string, unknown>
    : null;
  const filteredCount = typeof response?.raiMediaFilteredCount === "number" ? response.raiMediaFilteredCount : 0;
  if (filteredCount > 0) {
    throw new Error(getOperationErrorMessage(operation));
  }

  const videos = response?.videos;
  const videoUrl = await saveVideoResult(videos);
  return { done: true as const, videoUrl };
}
