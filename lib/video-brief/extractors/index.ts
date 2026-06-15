import { isIP } from "net";
import type { ExtractedVideoSource } from "@/types/video-brief";

const DIRECT_VIDEO_RE = /\.(mp4|m3u8|flv|mov|webm)(?:$|[?#])/i;
const HLS_MIME_TYPES = new Set(["application/x-mpegurl", "application/vnd.apple.mpegurl"]);

export class VideoSourceError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseAttributes(tag: string) {
  const attrs: Record<string, string> = {};
  const attrPattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] || match[3] || match[4] || "");
  }
  return attrs;
}

function collectTags(html: string, name: string) {
  const pattern = new RegExp(`<${name}\\b[^>]*>`, "gi");
  return html.match(pattern) || [];
}

function getMetaContent(html: string, keys: string[]) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const tag of collectTags(html, "meta")) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (normalizedKeys.has(key) && attrs.content) {
      return attrs.content;
    }
  }
  return "";
}

function getTitle(html: string) {
  const metaTitle = getMetaContent(html, ["og:title", "twitter:title", "title"]);
  if (metaTitle) return metaTitle;
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].replace(/\s+/g, " ")) : "";
}

function getCanonicalUrl(html: string, pageUrl: string) {
  for (const tag of collectTags(html, "link")) {
    const attrs = parseAttributes(tag);
    if ((attrs.rel || "").toLowerCase() === "canonical" && attrs.href) {
      return resolvePublicUrl(attrs.href, pageUrl);
    }
  }
  return pageUrl;
}

function getHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isPrivateIp(hostname: string) {
  const ipVersion = isIP(hostname);
  if (!ipVersion) return false;
  if (ipVersion === 6) {
    return hostname === "::1" || hostname.toLowerCase().startsWith("fc") || hostname.toLowerCase().startsWith("fd");
  }
  const parts = hostname.split(".").map((part) => Number(part));
  const [a, b] = parts;
  return a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0;
}

function assertPublicHttpUrl(input: string) {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new VideoSourceError("请输入正确的视频网址", 400);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new VideoSourceError("只支持 http 或 https 视频网址", 400);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isPrivateIp(hostname)
  ) {
    throw new VideoSourceError("不支持读取本地或内网地址", 400);
  }

  return parsed;
}

function resolvePublicUrl(value: string, baseUrl: string) {
  const parsed = new URL(value, baseUrl);
  assertPublicHttpUrl(parsed.toString());
  return parsed.toString();
}

function getPlatform(url: string) {
  const host = getHost(url).replace(/^www\./, "");
  if (host === "b23.tv" || host.endsWith("bilibili.com")) return "哔哩哔哩";
  if (host.endsWith("douyin.com")) return "抖音";
  if (host.endsWith("kuaishou.com") || host.endsWith("kwai.com")) return "快手";
  if (host.endsWith("youku.com")) return "优酷";
  if (host.endsWith("iqiyi.com")) return "爱奇艺";
  if (host.endsWith("mgtv.com")) return "芒果TV";
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "YouTube";
  if (host === "x.com" || host.endsWith("twitter.com")) return "X";
  if (host.endsWith("yangshipin.cn")) return "央视频";
  return "公开视频";
}

function isDirectVideoUrl(url: string) {
  try {
    const parsed = new URL(url);
    return DIRECT_VIDEO_RE.test(`${parsed.pathname}${parsed.search}`);
  } catch {
    return false;
  }
}

function isVideoMimeType(value: string) {
  const mimeType = value.trim().toLowerCase().split(";")[0];
  return mimeType.startsWith("video/") || HLS_MIME_TYPES.has(mimeType);
}

function getVideoCandidate(html: string, pageUrl: string) {
  const metaType = getMetaContent(html, ["og:video:type", "twitter:player:stream:content_type"]);
  const metaCandidates = [
    getMetaContent(html, ["og:video:secure_url"]),
    getMetaContent(html, ["og:video:url"]),
    getMetaContent(html, ["og:video"]),
    getMetaContent(html, ["twitter:player:stream"]),
  ].filter(Boolean);

  for (const candidate of metaCandidates) {
    const videoUrl = resolvePublicUrl(candidate, pageUrl);
    if (isDirectVideoUrl(videoUrl) || isVideoMimeType(metaType)) {
      return videoUrl;
    }
  }

  const mediaTags = [
    ...collectTags(html, "video"),
    ...collectTags(html, "source"),
  ];
  for (const tag of mediaTags) {
    const attrs = parseAttributes(tag);
    if (!attrs.src) continue;
    const videoUrl = resolvePublicUrl(attrs.src, pageUrl);
    if (isDirectVideoUrl(videoUrl) || isVideoMimeType(attrs.type || "")) {
      return videoUrl;
    }
  }

  return "";
}

function getDirectTitle(url: string) {
  const pathname = new URL(url).pathname;
  const name = pathname.split("/").filter(Boolean).pop() || "";
  return decodeURIComponent(name).replace(/\.(mp4|m3u8|flv|mov|webm)$/i, "");
}

function buildDirectSource(url: string): ExtractedVideoSource {
  const parsed = assertPublicHttpUrl(url);
  return {
    sourceUrl: parsed.toString(),
    canonicalUrl: parsed.toString(),
    platform: getPlatform(parsed.toString()),
    title: getDirectTitle(parsed.toString()),
    author: "",
    coverUrl: "",
    durationSeconds: 0,
    videoUrl: parsed.toString(),
  };
}

export async function extractVideoSource(inputUrl: string, signal?: AbortSignal): Promise<ExtractedVideoSource> {
  const parsed = assertPublicHttpUrl(String(inputUrl || "").trim());
  const sourceUrl = parsed.toString();
  const platform = getPlatform(sourceUrl);

  if (isDirectVideoUrl(sourceUrl)) {
    return buildDirectSource(sourceUrl);
  }

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; CPEC-VideoBrief/1.0)",
    },
    redirect: "follow",
    signal,
  });

  const responseUrl = response.url || sourceUrl;
  assertPublicHttpUrl(responseUrl);

  if (!response.ok) {
    throw new VideoSourceError(`视频页面读取失败（${response.status}）`, 502);
  }

  const contentType = response.headers.get("content-type") || "";
  if (isVideoMimeType(contentType) || isDirectVideoUrl(responseUrl)) {
    return buildDirectSource(responseUrl);
  }

  if (!contentType.toLowerCase().includes("text/html")) {
    throw new VideoSourceError("该地址不是可读取的视频页面", 422);
  }

  const html = await response.text();
  const canonicalUrl = getCanonicalUrl(html, responseUrl);
  const videoUrl = getVideoCandidate(html, responseUrl);
  if (!videoUrl) {
    throw new VideoSourceError(`无法读取${platform}的视频源。该视频可能需要登录、会员权限、DRM 或被平台反爬限制。`, 422);
  }

  const durationText = getMetaContent(html, ["video:duration", "og:video:duration", "duration"]);
  const durationSeconds = Number.isFinite(Number(durationText)) ? Math.max(0, Number(durationText)) : 0;

  return {
    sourceUrl,
    canonicalUrl,
    platform,
    title: getTitle(html),
    author: getMetaContent(html, ["author", "article:author", "og:site_name"]),
    coverUrl: getMetaContent(html, ["og:image:secure_url", "og:image", "twitter:image"]),
    durationSeconds,
    videoUrl,
  };
}
