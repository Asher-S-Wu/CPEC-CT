import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import {
  fetchVideoBriefSignedMediaUrl,
  isVideoBriefSignedMediaUrl,
  verifyVideoBriefMediaSignature,
} from "@/lib/video-brief/extractors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function copyResponseHeaders(response: Response) {
  const headers = new Headers();
  const names = [
    "accept-ranges",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ];

  for (const name of names) {
    const value = response.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  return headers;
}

export async function GET(request: NextRequest) {
  const mediaUrl = request.nextUrl.searchParams.get("url") || "";
  const exp = request.nextUrl.searchParams.get("exp") || "";
  const sig = request.nextUrl.searchParams.get("sig") || "";

  try {
    if (!verifyVideoBriefMediaSignature(mediaUrl, exp, sig) || !isVideoBriefSignedMediaUrl(mediaUrl)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const upstream = await fetchVideoBriefSignedMediaUrl(mediaUrl, request.headers.get("range"));

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: copyResponseHeaders(upstream),
    });
  } catch (error) {
    logError("video-brief", "read bilibili media", error);
    return new NextResponse("读取视频失败", { status: 502 });
  }
}
