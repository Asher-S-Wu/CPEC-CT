import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/audio/auth/session";
import { editAndStoreImage } from "@/lib/media/server/ark/images";
import {
  IMAGE_EDIT_ACCEPTED_MIME_TYPES,
  IMAGE_EDIT_MAX_BYTES,
  IMAGE_PROMPT_MAX_LENGTH,
  IMAGE_SIZE_OPTIONS,
  type ImageSize,
} from "@/lib/media/shared/models";
import { logError } from "@/lib/logger";

const ALLOWED_SIZES = new Set<string>(IMAGE_SIZE_OPTIONS.map((item) => item.id));
const ALLOWED_MIME_TYPES = new Set<string>(IMAGE_EDIT_ACCEPTED_MIME_TYPES);

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const prompt = String(formData.get("prompt") || "").trim();
    const size = String(formData.get("size") || "1920x1920");
    const image = formData.get("image");

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

    if (!(image instanceof File)) {
      return NextResponse.json({ success: false, message: "请上传需要编辑的图片" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return NextResponse.json({ success: false, message: "仅支持 PNG、JPG、WEBP 图片" }, { status: 400 });
    }

    if (image.size <= 0 || image.size > IMAGE_EDIT_MAX_BYTES) {
      return NextResponse.json({ success: false, message: "图片大小不能超过 25MB" }, { status: 400 });
    }

    const imageUrl = await editAndStoreImage({
      prompt,
      image,
      size: size as ImageSize,
      signal: request.signal,
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    logError("media.image", "edit image", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "图片编辑失败" },
      { status: 500 }
    );
  }
}
