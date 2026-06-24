import { resolveZenMuxVertexConfig } from "@/lib/ai/modelRoutes";
import { buildModelEndpoint, requestZenMuxVertexJson } from "@/lib/media/server/zenmux/http";
import { IMAGE_MODEL, type ImageSize } from "@/lib/media/shared/models";
import { saveImageBuffer, saveMediaFromUrl } from "@/lib/media/storage";

const SIZE_PARAMS: Record<ImageSize, { aspectRatio: string; sampleImageSize: string }> = {
  "1920x1920": { aspectRatio: "1:1", sampleImageSize: "2K" },
  "2560x1440": { aspectRatio: "16:9", sampleImageSize: "2K" },
  "1440x2560": { aspectRatio: "9:16", sampleImageSize: "2K" },
};

async function fileToVertexImage(file: File) {
  const mimeType = file.type || "image/png";
  const bytesBase64Encoded = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { bytesBase64Encoded, mimeType };
}

function buildImageParameters(size: ImageSize) {
  const params = SIZE_PARAMS[size];
  return {
    sampleCount: 1,
    aspectRatio: params.aspectRatio,
    sampleImageSize: params.sampleImageSize,
    addWatermark: false,
  };
}

async function savePredictionResult(predictions: unknown) {
  if (!Array.isArray(predictions) || !predictions.length) {
    throw new Error("图片处理失败，未返回有效结果");
  }

  const item = predictions[0] as Record<string, unknown>;
  const b64 = typeof item.bytesBase64Encoded === "string" ? item.bytesBase64Encoded : "";
  const mimeType = typeof item.mimeType === "string" && item.mimeType ? item.mimeType : "image/png";
  const gcsUri = typeof item.gcsUri === "string" ? item.gcsUri : "";

  if (b64) {
    const saved = await saveImageBuffer(Buffer.from(b64, "base64"), mimeType);
    return saved.url;
  }

  if (gcsUri) {
    const saved = await saveMediaFromUrl(gcsUri, mimeType, "media-image");
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
  const { apiKey, baseUrl } = resolveZenMuxVertexConfig();
  const response = await requestZenMuxVertexJson({
    url: buildModelEndpoint(baseUrl, IMAGE_MODEL, "predict"),
    apiKey,
    body: {
      instances: [{ prompt }],
      parameters: buildImageParameters(size),
    },
    signal,
    serviceName: "图片",
  });

  return savePredictionResult(response.predictions);
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
  const { apiKey, baseUrl } = resolveZenMuxVertexConfig();
  const response = await requestZenMuxVertexJson({
    url: buildModelEndpoint(baseUrl, IMAGE_MODEL, "predict"),
    apiKey,
    body: {
      instances: [{
        prompt,
        image: await fileToVertexImage(image),
      }],
      parameters: buildImageParameters(size),
    },
    signal,
    serviceName: "图片",
  });

  return savePredictionResult(response.predictions);
}
