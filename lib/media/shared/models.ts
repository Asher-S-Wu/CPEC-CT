export const IMAGE_MODEL = "doubao-seedream-5-0-lite-260128";
export const VIDEO_MODEL = "doubao-seedance-2-0-fast-260128";

export const IMAGE_MODEL_NAME = "Doubao Seedream 5.0 Lite";
export const VIDEO_MODEL_NAME = "Doubao Seedance 2.0 Fast";
export const IMAGE_PROMPT_MAX_LENGTH = 32000;
export const IMAGE_EDIT_MAX_BYTES = 25 * 1024 * 1024;
export const IMAGE_EDIT_ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const VIDEO_PROMPT_MAX_LENGTH = 32000;
export const VIDEO_FRAME_MAX_BYTES = 25 * 1024 * 1024;
export const VIDEO_FRAME_ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const IMAGE_ICON_URL =
  "https://cdn.marmot-cloud.com/storage/zenmux/2026/04/08/YSFtnJU/Property-1Bytedance.svg";

export const VIDEO_ICON_URL =
  "https://cdn.marmot-cloud.com/storage/zenmux/2026/04/08/YSFtnJU/Property-1Bytedance.svg";

export const IMAGE_SIZE_OPTIONS = [
  { id: "1920x1920", label: "正方形 1920×1920" },
  { id: "2560x1440", label: "横版 2560×1440" },
  { id: "1440x2560", label: "竖版 1440×2560" },
] as const;

export const VIDEO_ASPECT_RATIO_OPTIONS = [
  { id: "21:9", label: "超宽屏 21:9" },
  { id: "16:9", label: "横屏 16:9" },
  { id: "4:3", label: "横屏 4:3" },
  { id: "1:1", label: "方形 1:1" },
  { id: "3:4", label: "竖屏 3:4" },
  { id: "9:16", label: "竖屏 9:16" },
  { id: "adaptive", label: "自适应" },
] as const;

export const VIDEO_DURATION_OPTIONS = [
  { id: -1, label: "自动" },
  { id: 4, label: "4 秒" },
  { id: 5, label: "5 秒" },
  { id: 6, label: "6 秒" },
  { id: 7, label: "7 秒" },
  { id: 8, label: "8 秒" },
  { id: 9, label: "9 秒" },
  { id: 10, label: "10 秒" },
  { id: 11, label: "11 秒" },
  { id: 12, label: "12 秒" },
] as const;

export const VIDEO_RESOLUTION_OPTIONS = [
  { id: "480p", label: "480p" },
  { id: "720p", label: "720p" },
] as const;

export type ImageSize = (typeof IMAGE_SIZE_OPTIONS)[number]["id"];
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIO_OPTIONS)[number]["id"];
export type VideoDuration = (typeof VIDEO_DURATION_OPTIONS)[number]["id"];
export type VideoResolution = (typeof VIDEO_RESOLUTION_OPTIONS)[number]["id"];
