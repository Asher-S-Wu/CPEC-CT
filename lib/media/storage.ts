import crypto from "crypto";
import { saveStoredResponse } from "@/lib/storage/server";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

function makeFilename(prefix: string, ext: string) {
  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
  return `${prefix}-${id}.${ext}`;
}

function getExtFromMimeType(mimeType: string, fallback = "bin") {
  return MIME_TO_EXT[String(mimeType || "").toLowerCase()] || fallback;
}

export async function saveMediaFromUrl(
  userId: string,
  url: string,
  mimeType: string,
  prefix: "media-image" | "media-video",
  signal?: AbortSignal
) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`下载媒体失败（${response.status}）`);
  }
  const isImage = prefix === "media-image";
  const extension = getExtFromMimeType(mimeType, isImage ? "png" : "mp4");
  return saveStoredResponse(response, {
    userId,
    originalName: makeFilename(prefix, extension),
    mimeType,
    extension,
    category: isImage ? "image" : "video",
    scope: prefix,
    maxBytes: isImage ? 100 * 1024 * 1024 : 1024 * 1024 * 1024,
    signal,
  });
}
