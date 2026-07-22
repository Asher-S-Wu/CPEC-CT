import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { findStoredFileByPublicId } from "@/lib/storage/repository";
import { createStoredFileReadStream } from "@/lib/storage/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INLINE_CATEGORIES = new Set(["image", "audio", "video"]);

function safeDispositionFilename(value: string) {
  const ascii = value.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_") || "download";
  return `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(value)}`;
}

function parseRange(value: string | null, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return false;

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return false;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) return false;
  return { start, end: Math.min(end, size - 1) };
}

async function handle(request: NextRequest, context: { params: Promise<{ publicId: string; filename: string }> }, headOnly: boolean) {
  const { publicId, filename } = await context.params;
  const file = await findStoredFileByPublicId(publicId);
  if (!file || filename !== file.originalName) {
    return new Response("Not found", { status: 404 });
  }

  const etag = `"sha256-${file.sha256}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const range = parseRange(request.headers.get("range"), file.size);
  if (range === false) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${file.size}`, "Accept-Ranges": "bytes" },
    });
  }

  const forceDownload = request.nextUrl.searchParams.get("download") === "1" || !INLINE_CATEGORIES.has(file.category);
  const disposition = `${forceDownload ? "attachment" : "inline"}; ${safeDispositionFilename(file.originalName)}`;
  const start = range?.start ?? 0;
  const end = range?.end ?? Math.max(0, file.size - 1);
  const contentLength = file.size === 0 ? 0 : end - start + 1;
  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": disposition,
    "Content-Length": String(contentLength),
    "Content-Type": file.mimeType,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    ...(range ? { "Content-Range": `bytes ${start}-${end}/${file.size}` } : {}),
  };

  if (headOnly) return new Response(null, { status: range ? 206 : 200, headers });
  const stream = createStoredFileReadStream(file.relativePath, range || undefined);
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: range ? 206 : 200, headers });
}

export function GET(request: NextRequest, context: { params: Promise<{ publicId: string; filename: string }> }) {
  return handle(request, context, false);
}

export function HEAD(request: NextRequest, context: { params: Promise<{ publicId: string; filename: string }> }) {
  return handle(request, context, true);
}
