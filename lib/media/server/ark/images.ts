import { resolveArkProviderConfig } from "@/lib/ai/modelRoutes";
import { requestArkJson } from "@/lib/media/server/ark/http";
import { IMAGE_MODEL, type ImageSize } from "@/lib/media/shared/models";
import { saveImageBuffer, saveMediaFromUrl } from "@/lib/media/storage";

async function fileToDataUrl(file: File) {
  const mimeType = file.type || "image/png";
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${mimeType};base64,${bytes}`;
}

async function saveImageResult(response: { data?: Array<{ url?: string | null; b64_json?: string | null }> }) {
  const item = response.data?.[0];
  const remoteUrl = item?.url;
  const b64 = item?.b64_json;

  if (typeof b64 === "string" && b64) {
    const saved = await saveImageBuffer(Buffer.from(b64, "base64"), "image/png");
    return saved.url;
  }

  if (typeof remoteUrl === "string" && remoteUrl) {
    const saved = await saveMediaFromUrl(remoteUrl, "image/png", "media-image");
    return saved.url;
  }

  throw new Error("图片处理失败，未返回有效结果");
}

export async function generateAndStoreImage({
  prompt,
  size = "1920x1920",
  signal,
}: {
  prompt: string;
  size?: ImageSize;
  signal?: AbortSignal;
}) {
  const { apiKey, openAIBaseUrl } = resolveArkProviderConfig();
  const response = await requestArkJson({
    url: `${openAIBaseUrl}/images/generations`,
    apiKey,
    body: {
      model: IMAGE_MODEL,
      prompt,
      size,
      response_format: "url",
      watermark: false,
    },
    signal,
    serviceName: "图片",
  });

  return saveImageResult(response);
}

export async function editAndStoreImage({
  prompt,
  image,
  size = "1920x1920",
  signal,
}: {
  prompt: string;
  image: File;
  size?: ImageSize;
  signal?: AbortSignal;
}) {
  const { apiKey, openAIBaseUrl } = resolveArkProviderConfig();
  const response = await requestArkJson({
    url: `${openAIBaseUrl}/images/generations`,
    apiKey,
    body: {
      model: IMAGE_MODEL,
      prompt,
      image: await fileToDataUrl(image),
      size,
      response_format: "url",
      watermark: false,
    },
    signal,
    serviceName: "图片",
  });

  return saveImageResult(response);
}
