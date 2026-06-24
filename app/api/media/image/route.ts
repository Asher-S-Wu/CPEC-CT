import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/audio/auth/session";
import { generateAndStoreImage } from "@/lib/media/server/bailian/images";
import { IMAGE_PROMPT_MAX_LENGTH, IMAGE_SIZE_OPTIONS, type ImageSize } from "@/lib/media/shared/models";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const ALLOWED_SIZES = new Set<string>(IMAGE_SIZE_OPTIONS.map((item) => item.id));

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const size = typeof body?.size === "string" ? body.size : "2048*2048";

    if (!prompt) {
      return NextResponse.json({ success: false, message: "请输入图片描述" }, { status: 400 });
    }

    if (prompt.length > IMAGE_PROMPT_MAX_LENGTH) {
      return NextResponse.json(
        { success: false, message: `描述最多支持 ${IMAGE_PROMPT_MAX_LENGTH} 个字符` },
        { status: 400 }
      );
    }

    if (!ALLOWED_SIZES.has(size)) {
      return NextResponse.json({ success: false, message: "不支持的图片尺寸" }, { status: 400 });
    }

    const imageUrl = await generateAndStoreImage({
      prompt,
      size: size as ImageSize,
      signal: request.signal,
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    logError("media.image", "generate image", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "图片生成失败" },
      { status: 500 }
    );
  }
}
