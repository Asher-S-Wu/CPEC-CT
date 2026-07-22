const SAME_ORIGIN_BASE = "https://stored-file.invalid";

export function isStoredFileUrl(url) {
  if (typeof url !== "string" || !url || url !== url.trim()) return false;
  if (!url.startsWith("/files/")) return false;

  try {
    const parsed = new URL(url, SAME_ORIGIN_BASE);
    const pathParts = parsed.pathname.split("/");
    return parsed.origin === SAME_ORIGIN_BASE
      && pathParts.length === 4
      && pathParts[1] === "files"
      && /^[A-Za-z0-9_-]{24,64}$/.test(pathParts[2])
      && Boolean(pathParts[3])
      && !parsed.search
      && !parsed.hash;
  } catch {
    return false;
  }
}

export function toAbsoluteFileUrl(url, origin) {
  if (!isStoredFileUrl(url) || typeof origin !== "string" || !origin) return null;

  try {
    const base = new URL(origin);
    if (base.protocol !== "http:" && base.protocol !== "https:") return null;
    return new URL(url, base.origin).toString();
  } catch {
    return null;
  }
}

export function toFileDownloadUrl(url) {
  if (!isStoredFileUrl(url)) return null;

  const parsed = new URL(url, SAME_ORIGIN_BASE);
  parsed.searchParams.set("download", "1");
  return `${parsed.pathname}${parsed.search}`;
}
