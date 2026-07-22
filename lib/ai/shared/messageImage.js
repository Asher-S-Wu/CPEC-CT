import { isStoredFileUrl } from "@/lib/ai/shared/fileUrls";

export const isStoredImageUrl = (src) => isStoredFileUrl(src);

export const isDataImageUrl = (src) => typeof src === "string" && /^data:image\//i.test(src);
