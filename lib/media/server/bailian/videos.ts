import { dashScopeRequest, getTaskId, getTaskStatus } from "@/lib/ai/server/bailian/dashscope";
import {
  VIDEO_IMAGE_MODEL,
  VIDEO_TEXT_MODEL,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
} from "@/lib/media/shared/models";
import { saveMediaFromUrl } from "@/lib/media/storage";

const VIDEO_SYNTHESIS_PATH = "/services/aigc/video-generation/video-synthesis";

const RUNNING_STATUSES = new Set(["PENDING", "RUNNING"]);
const FAILED_STATUSES = new Set(["FAILED", "CANCELED", "UNKNOWN"]);

async function fileToDataUrl(file: File) {
  const mimeType = file.type || "image/png";
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function getTaskErrorMessage(payload: Record<string, unknown>) {
  const output = typeof payload.output === "object" && payload.output
    ? payload.output as Record<string, unknown>
    : {} as Record<string, unknown>;

  const message = output.message || payload.message;
  const code = output.code || payload.code;

  if (typeof message === "string" && message.trim()) return message.trim();
  if (typeof code === "string" && code.trim()) return code.trim();
  return "视频生成失败";
}

export async function submitVideoGeneration({
  prompt,
  image,
  aspectRatio = "16:9",
  durationSeconds = 5,
  resolution = "720P",
  signal,
}: {
  prompt: string;
  image?: File;
  aspectRatio?: VideoAspectRatio;
  durationSeconds?: VideoDuration;
  resolution?: VideoResolution;
  signal?: AbortSignal;
}) {
  const text = typeof prompt === "string" ? prompt.trim() : "";
  const input: Record<string, unknown> = {};

  if (text) {
    input.prompt = text;
  }

  if (image) {
    input.media = [{
      type: "first_frame",
      url: await fileToDataUrl(image),
    }];
  }

  const body: Record<string, unknown> = {
    model: image ? VIDEO_IMAGE_MODEL : VIDEO_TEXT_MODEL,
    input,
    parameters: {
      resolution,
      duration: durationSeconds,
      ...(image ? {} : { ratio: aspectRatio }),
    },
  };

  const response = await dashScopeRequest(VIDEO_SYNTHESIS_PATH, {
    headers: { "X-DashScope-Async": "enable" },
    body,
    signal,
  }) as Record<string, unknown>;

  const taskId = getTaskId(response);
  if (!taskId) {
    throw new Error("视频任务提交完成，但没有返回任务编号");
  }

  return { taskId };
}

export async function fetchAndStoreVideoGenerationResult({
  userId,
  taskId,
  signal,
}: {
  userId: string;
  taskId: string;
  signal?: AbortSignal;
}) {
  const payload = await dashScopeRequest(`/tasks/${encodeURIComponent(taskId)}`, {
    method: "GET",
    signal,
  }) as Record<string, unknown>;

  const status = getTaskStatus(payload);
  if (!status || RUNNING_STATUSES.has(status)) {
    return { done: false as const, status };
  }

  if (FAILED_STATUSES.has(status)) {
    throw new Error(getTaskErrorMessage(payload));
  }

  if (status !== "SUCCEEDED") {
    return { done: false as const, status };
  }

  const output = typeof payload.output === "object" && payload.output
    ? payload.output as Record<string, unknown>
    : {} as Record<string, unknown>;
  const videoUrl = typeof output.video_url === "string" ? output.video_url.trim() : "";

  if (!videoUrl) {
    throw new Error("视频生成完成，但没有返回可下载内容");
  }

  const saved = await saveMediaFromUrl(userId, videoUrl, "video/mp4", "media-video", signal);
  return { done: true as const, videoUrl: saved.url };
}
