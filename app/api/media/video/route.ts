import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/audio/auth/session";
import { submitVideoGeneration } from "@/lib/media/server/bailian/videos";
import {
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VIDEO_FRAME_ACCEPTED_MIME_TYPES,
  VIDEO_FRAME_MAX_BYTES,
  VIDEO_PROMPT_MAX_LENGTH,
  VIDEO_PROMPT_MAX_WEIGHT,
  VIDEO_RESOLUTION_OPTIONS,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
  getVideoPromptLengthWeight,
} from "@/lib/media/shared/models";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const ALLOWED_ASPECT_RATIOS = new Set<string>(VIDEO_ASPECT_RATIO_OPTIONS.map((item) => item.id));
const ALLOWED_DURATIONS = new Set<number>(VIDEO_DURATION_OPTIONS.map((item) => item.id));
const ALLOWED_RESOLUTIONS = new Set<string>(VIDEO_RESOLUTION_OPTIONS.map((item) => item.id));
const ALLOWED_FRAME_MIME_TYPES = new Set<string>(VIDEO_FRAME_ACCEPTED_MIME_TYPES);

function readOptionalString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalImage(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function validateFrameImage(image: File | null, label: string) {
  if (!image) return "";
  if (!ALLOWED_FRAME_MIME_TYPES.has(image.type)) {
    return `${label}仅支持 PNG、JPG、JPEG、WEBP 图片`;
  }
  if (image.size > VIDEO_FRAME_MAX_BYTES) {
    return `${label}大小不能超过 20MB`;
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const prompt = readOptionalString(formData, "prompt");
    const aspectRatio = readOptionalString(formData, "aspectRatio") || "16:9";
    const durationSeconds = Number(readOptionalString(formData, "durationSeconds"));
    const resolution = readOptionalString(formData, "resolution") || "720P";
    const image = readOptionalImage(formData, "image");

    if (!prompt && !image) {
      return NextResponse.json({ success: false, message: "请输入视频描述" }, { status: 400 });
    }

    if (prompt.length > VIDEO_PROMPT_MAX_LENGTH || getVideoPromptLengthWeight(prompt) > VIDEO_PROMPT_MAX_WEIGHT) {
      return NextResponse.json(
        { success: false, message: "描述最多支持约 2500 个中文字符或 5000 个英文字符" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      return NextResponse.json({ success: false, message: "不支持的画面比例" }, { status: 400 });
    }

    if (!ALLOWED_DURATIONS.has(durationSeconds)) {
      return NextResponse.json({ success: false, message: "不支持的视频时长" }, { status: 400 });
    }

    if (!ALLOWED_RESOLUTIONS.has(resolution)) {
      return NextResponse.json({ success: false, message: "不支持的分辨率" }, { status: 400 });
    }

    const imageError = validateFrameImage(image, "首帧图片");
    if (imageError) {
      return NextResponse.json({ success: false, message: imageError }, { status: 400 });
    }

    const { taskId } = await submitVideoGeneration({
      prompt,
      image: image || undefined,
      aspectRatio: aspectRatio as VideoAspectRatio,
      durationSeconds: durationSeconds as VideoDuration,
      resolution: resolution as VideoResolution,
      signal: request.signal,
    });

    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    logError("media.video", "generate video", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "视频生成失败" },
      { status: 500 }
    );
  }
}
