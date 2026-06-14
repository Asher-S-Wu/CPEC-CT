export const isHttpUrl = (src) => typeof src === "string" && /^https?:\/\//i.test(src);

export const isDataImageUrl = (src) => typeof src === "string" && /^data:image\//i.test(src);
