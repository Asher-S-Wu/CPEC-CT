import OpenAI from "openai";
import { resolveZenMuxProviderConfig } from "@/lib/ai/modelRoutes";
import { IMAGE_MODEL } from "@/lib/media/shared/models";
import { saveImageBuffer, saveMediaFromUrl } from "@/lib/media/storage";

const OUTPUT_FORMAT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function createZenMuxOpenAIClient() {
  const { openAIBaseUrl, apiKey } = resolveZenMuxProviderConfig();
  return new OpenAI({
    apiKey,
    baseURL: openAIBaseUrl,
  });
}

export async function generateAndStoreImage({
  prompt,
  size = "1024x1024",
  signal,
}: {
  prompt: string;
  size?: string;
  signal?: AbortSignal;
}) {
  const client = createZenMuxOpenAIClient();
  const response = await client.images.generate(
    {
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size,
    },
    { signal }
  );

  const item = response.data?.[0];
  const b64 = item?.b64_json;
  const remoteUrl = item?.url;

  if (typeof b64 === "string" && b64) {
    const outputFormat = typeof item?.output_format === "string" ? item.output_format : "png";
    const mimeType = OUTPUT_FORMAT_TO_MIME[outputFormat] || "image/png";
    const saved = await saveImageBuffer(Buffer.from(b64, "base64"), mimeType);
    return saved.url;
  }

  if (typeof remoteUrl === "string" && remoteUrl) {
    const saved = await saveMediaFromUrl(remoteUrl, "image/png", "media-image");
    return saved.url;
  }

  throw new Error("图片生成失败，未返回有效结果");
}
