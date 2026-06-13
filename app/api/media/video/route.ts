import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/audio/auth/session";
import { generateAndStoreVideo } from "@/lib/media/server/zenmux/videos";
import {
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
} from "@/lib/media/shared/models";
import { logError } from "@/lib/logger";

const ALLOWED_ASPECT_RATIOS = new Set(VIDEO_ASPECT_RATIO_OPTIONS.map((item) => item.id));
const ALLOWED_DURATIONS = new Set(VIDEO_DURATION_OPTIONS.map((item) => item.id));
const ALLOWED_RESOLUTIONS = new Set(VIDEO_RESOLUTION_OPTIONS.map((item) => item.id));

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : "16:9";
    const durationSeconds = Number(body?.durationSeconds);
    const resolution = typeof body?.resolution === "string" ? body.resolution : "720p";

    if (!prompt) {
      return NextResponse.json({ success: false, message: "请输入视频描述" }, { status: 400 });
    }

    if (prompt.length > 4000) {
      return NextResponse.json({ success: false, message: "描述最多支持 4000 个字符" }, { status: 400 });
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

    const videoUrl = await generateAndStoreVideo({
      prompt,
      aspectRatio,
      durationSeconds,
      resolution,
      signal: request.signal,
    });

    return NextResponse.json({ success: true, videoUrl });
  } catch (error) {
    logError("media.video", "generate video", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "视频生成失败" },
      { status: 500 }
    );
  }
}
