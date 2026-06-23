import { sha256 } from "@/lib/scraper/utils";

export function buildScraperDedupeKey(parts: Array<string | number | null | undefined>) {
  return sha256(
    parts
      .filter((item) => item !== null && item !== undefined && item !== "")
      .map((item) => String(item))
      .join("::")
  );
}

export function cleanObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function normalizeUrlArray(payload: any) {
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  return [];
}

export function parseIsoDate(value: unknown) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pickBestUrl(item: any) {
  return typeof item?.url === "string" ? item.url.trim() : "";
}

export function pickBestTitle(item: any, fallback = "") {
  return typeof item?.title === "string" && item.title.trim() ? item.title.trim() : fallback;
}
