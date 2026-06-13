import type {
  ImageSize,
  VideoAspectRatio,
  VideoDuration,
  VideoResolution,
} from "@/lib/media/shared/models";

async function readJson(response: Response) {
  return response.json();
}

export async function generateImage(input: {
  prompt: string;
  size: ImageSize;
}) {
  const response = await fetch("/api/media/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.message || "图片生成失败");
  }
  if (!data.imageUrl) {
    throw new Error("图片生成完成，但没有返回结果");
  }
  return String(data.imageUrl);
}

export async function generateVideo(input: {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  durationSeconds: VideoDuration;
  resolution: VideoResolution;
}) {
  const response = await fetch("/api/media/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.message || "视频生成失败");
  }
  if (!data.videoUrl) {
    throw new Error("视频生成完成，但没有返回结果");
  }
  return String(data.videoUrl);
}
