import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/audio/auth/session";
import { fetchAndStoreVideoGenerationResult } from "@/lib/media/server/bailian/videos";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const taskId = typeof body?.taskId === "string" ? body.taskId.trim() : "";

    if (!taskId) {
      return NextResponse.json({ success: false, message: "缺少视频任务编号" }, { status: 400 });
    }

    const result = await fetchAndStoreVideoGenerationResult({
      userId: session.userId,
      taskId,
      signal: request.signal,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logError("media.video", "check video status", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "视频生成失败" },
      { status: 500 }
    );
  }
}
