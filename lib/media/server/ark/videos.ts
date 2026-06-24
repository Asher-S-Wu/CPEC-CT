import { resolveArkProviderConfig } from "@/lib/ai/modelRoutes";
import {
  VIDEO_MODEL,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
} from "@/lib/media/shared/models";
import { saveMediaFromUrl } from "@/lib/media/storage";

const PENDING_STATUSES = new Set(["queued", "running"]);

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

async function fileToDataUrl(file?: File) {
  if (!file) return "";
  const mimeType = file.type || "image/png";
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${mimeType};base64,${bytes}`;
}

async function buildVideoContent({
  prompt,
  image,
  lastFrame,
}: {
  prompt: string;
  image?: File;
  lastFrame?: File;
}) {
  const content: Array<Record<string, unknown>> = [];
  const text = typeof prompt === "string" ? prompt.trim() : "";
  const firstFrameUrl = await fileToDataUrl(image);
  const lastFrameUrl = await fileToDataUrl(lastFrame);

  if (text) {
    content.push({ type: "text", text });
  }
  if (firstFrameUrl) {
    content.push({
      type: "image_url",
      image_url: { url: firstFrameUrl },
      role: "first_frame",
    });
  }
  if (lastFrameUrl) {
    content.push({
      type: "image_url",
      image_url: { url: lastFrameUrl },
      role: "last_frame",
    });
  }

  return content;
}

function getTaskErrorMessage(task: Record<string, unknown>) {
  if (typeof task?.error === "object" && task.error) {
    const message = (task.error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (typeof task?.message === "string" && task.message.trim()) return task.message.trim();
  return "视频生成失败";
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
  const { apiKey, openAIBaseUrl } = resolveArkProviderConfig();
  const response = await fetch(`${openAIBaseUrl}/contents/generations/tasks`, {
    method: "POST",
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      model: VIDEO_MODEL,
      content: await buildVideoContent({ prompt, image, lastFrame }),
      ratio: aspectRatio,
      duration: durationSeconds,
      resolution,
      generate_audio: generateAudio,
      watermark: false,
    }),
    signal,
  });

  const data = await readJsonResponse(response);
  const taskId = typeof data?.id === "string" ? data.id.trim() : "";
  if (!taskId) {
    throw new Error("视频生成任务提交失败");
  }

  return { operationName: taskId };
}

export async function fetchAndStoreVideoGenerationResult({
  operationName,
  signal,
}: {
  operationName: string;
  signal?: AbortSignal;
}) {
  const { apiKey, openAIBaseUrl } = resolveArkProviderConfig();
  const taskId = encodeURIComponent(operationName);
  const response = await fetch(`${openAIBaseUrl}/contents/generations/tasks/${taskId}`, {
    method: "GET",
    headers: getAuthHeaders(apiKey),
    signal,
  });

  const task = await readJsonResponse(response);
  const status = typeof task?.status === "string" ? task.status : "";

  if (PENDING_STATUSES.has(status)) {
    return { done: false as const };
  }

  if (status !== "succeeded") {
    throw new Error(getTaskErrorMessage(task));
  }

  const videoUrl = typeof task?.content?.video_url === "string" ? task.content.video_url : "";
  if (!videoUrl) {
    throw new Error("视频生成失败，未返回可下载内容");
  }

  const saved = await saveMediaFromUrl(videoUrl, "video/mp4", "media-video");
  return { done: true as const, videoUrl: saved.url };
}
