export const IMAGE_MODEL = "openai/gpt-image-2";
export const VIDEO_MODEL = "bytedance/doubao-seedance-2.0";

export const IMAGE_MODEL_NAME = "GPT Image 2";
export const VIDEO_MODEL_NAME = "Seedance 2.0";

export const IMAGE_ICON_URL =
  "https://cdn.marmot-cloud.com/storage/zenmux/2025/10/15/Mm7IePA/Property-1GPT.svg";

export const VIDEO_ICON_URL =
  "https://cdn.marmot-cloud.com/storage/zenmux/2026/04/08/YSFtnJU/Property-1Bytedance.svg";

export const IMAGE_SIZE_OPTIONS = [
  { id: "1024x1024", label: "正方形 1024×1024" },
  { id: "1536x1024", label: "横版 1536×1024" },
  { id: "1024x1536", label: "竖版 1024×1536" },
] as const;

export const VIDEO_ASPECT_RATIO_OPTIONS = [
  { id: "16:9", label: "横屏 16:9" },
  { id: "9:16", label: "竖屏 9:16" },
  { id: "1:1", label: "方形 1:1" },
] as const;

export const VIDEO_DURATION_OPTIONS = [
  { id: 5, label: "5 秒" },
  { id: 8, label: "8 秒" },
] as const;

export const VIDEO_RESOLUTION_OPTIONS = [
  { id: "720p", label: "720p" },
  { id: "1080p", label: "1080p" },
] as const;

export type ImageSize = (typeof IMAGE_SIZE_OPTIONS)[number]["id"];
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIO_OPTIONS)[number]["id"];
export type VideoDuration = (typeof VIDEO_DURATION_OPTIONS)[number]["id"];
export type VideoResolution = (typeof VIDEO_RESOLUTION_OPTIONS)[number]["id"];

export function parseModelSlug(slug: string) {
  const index = slug.indexOf("/");
  if (index < 0) {
    return { provider: slug, model: slug };
  }
  return {
    provider: slug.slice(0, index),
    model: slug.slice(index + 1),
  };
}
