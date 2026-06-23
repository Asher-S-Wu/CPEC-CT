import { upsertScraperRecord } from "@/lib/scraper/services/records";
import {
  buildScraperDedupeKey,
  cleanObject,
  normalizeUrlArray,
  parseIsoDate,
  pickBestTitle,
  pickBestUrl
} from "@/lib/scraper/source-runners/helpers";
import type { ScraperRunDoc, ScraperSourceDoc } from "@/lib/scraper/types";
import { tavilyCrawl, tavilyExtract, tavilyMap, tavilySearch } from "@/lib/tavily/client";

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resultContent(item: any) {
  if (typeof item?.raw_content === "string" && item.raw_content.trim()) {
    return item.raw_content.trim();
  }
  return typeof item?.content === "string" ? item.content.trim() : "";
}

function resultSummary(item: any) {
  return typeof item?.content === "string" ? item.content.trim() : "";
}

function resultImages(item: any) {
  return Array.isArray(item?.images) ? item.images : [];
}

function resultFavicon(item: any) {
  return typeof item?.favicon === "string" ? item.favicon.trim() : "";
}

function resultTitle(item: any, url: string) {
  const explicit = pickBestTitle(item, "");
  if (explicit) return explicit;
  const firstLine = resultContent(item)
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean);
  return firstLine ? firstLine.slice(0, 240) : url;
}

async function storeDiscoveryRecord(
  source: ScraperSourceDoc,
  run: ScraperRunDoc,
  kind: "tavily_search_result" | "tavily_map_result",
  item: any
) {
  const url = typeof item === "string" ? item : pickBestUrl(item);
  if (!url) {
    return false;
  }

  await upsertScraperRecord({
    sourceId: source._id!,
    runId: run._id!,
    kind,
    title: typeof item === "string" ? item : pickBestTitle(item, url),
    url,
    publishedAt: parseIsoDate(item?.published_date || item?.publishedAt || item?.date),
    dedupeKey: buildScraperDedupeKey([String(source._id), kind, url]),
    metrics: {
      score: typeof item?.score === "number" ? item.score : null
    },
    payload: {
      summary: resultSummary(item),
      content: resultContent(item),
      images: resultImages(item),
      favicon: resultFavicon(item),
      sourceLinks: [url],
      raw: item
    }
  });

  return true;
}

async function storePageRecord(
  source: ScraperSourceDoc,
  run: ScraperRunDoc,
  kind: "tavily_extract_result" | "tavily_crawl_result",
  item: any
) {
  const url = pickBestUrl(item);
  if (!url) {
    return false;
  }

  await upsertScraperRecord({
    sourceId: source._id!,
    runId: run._id!,
    kind,
    title: resultTitle(item, url),
    url,
    publishedAt: parseIsoDate(item?.published_date || item?.publishedAt || item?.date),
    dedupeKey: buildScraperDedupeKey([String(source._id), kind, url]),
    metrics: {
      score: typeof item?.score === "number" ? item.score : null
    },
    payload: {
      summary: resultSummary(item),
      content: resultContent(item),
      images: resultImages(item),
      favicon: resultFavicon(item),
      sourceLinks: [url],
      raw: item
    }
  });

  return true;
}

export async function runSearch(source: ScraperSourceDoc, run: ScraperRunDoc) {
  const config = source.config as Record<string, any>;
  const topic = config.topic || "general";
  const payload = cleanObject({
    query: config.query,
    search_depth: config.searchDepth || "advanced",
    chunks_per_source: numberValue(config.chunksPerSource, 3),
    max_results: numberValue(config.maxResults, 5),
    topic,
    time_range: config.timeRange || undefined,
    start_date: config.startDate || undefined,
    end_date: config.endDate || undefined,
    include_domains: stringArray(config.includeDomains),
    exclude_domains: stringArray(config.excludeDomains),
    country: topic === "general" ? config.country || undefined : undefined,
    include_answer: false,
    include_raw_content: "markdown",
    include_images: true,
    include_image_descriptions: true,
    include_favicon: true,
    include_usage: true
  });

  const response = await tavilySearch(payload);
  const items = normalizeUrlArray(response);
  let total = 0;
  for (const item of items) {
    if (await storeDiscoveryRecord(source, run, "tavily_search_result", item)) {
      total += 1;
    }
  }

  return { requestPayload: payload, responsePayload: response, stats: { total } };
}

export async function runMap(source: ScraperSourceDoc, run: ScraperRunDoc) {
  const config = source.config as Record<string, any>;
  const payload = cleanObject({
    url: config.url,
    instructions: config.instructions || undefined,
    max_depth: numberValue(config.maxDepth, 1),
    max_breadth: numberValue(config.maxBreadth, 20),
    limit: numberValue(config.limit, 50),
    select_paths: stringArray(config.selectPaths),
    select_domains: stringArray(config.selectDomains),
    exclude_paths: stringArray(config.excludePaths),
    exclude_domains: stringArray(config.excludeDomains),
    allow_external: false,
    timeout: 150,
    include_usage: true
  });

  const response = await tavilyMap(payload);
  const items = normalizeUrlArray(response);
  let total = 0;
  for (const item of items) {
    if (await storeDiscoveryRecord(source, run, "tavily_map_result", item)) {
      total += 1;
    }
  }

  return { requestPayload: payload, responsePayload: response, stats: { total } };
}

export async function runExtract(source: ScraperSourceDoc, run: ScraperRunDoc) {
  const config = source.config as Record<string, any>;
  const urls = stringArray(config.urls);
  const payload = cleanObject({
    urls: urls.length > 0 ? urls : config.url,
    query: config.query || undefined,
    chunks_per_source: config.query ? numberValue(config.chunksPerSource, 3) : undefined,
    extract_depth: "advanced",
    include_images: true,
    include_favicon: true,
    format: "markdown",
    timeout: 60,
    include_usage: true
  });

  const response = await tavilyExtract(payload);
  const items = normalizeUrlArray(response);
  let total = 0;
  for (const item of items) {
    if (await storePageRecord(source, run, "tavily_extract_result", item)) {
      total += 1;
    }
  }

  return { requestPayload: payload, responsePayload: response, stats: { total } };
}

export async function runCrawl(source: ScraperSourceDoc, run: ScraperRunDoc) {
  const config = source.config as Record<string, any>;
  const payload = cleanObject({
    url: config.url,
    instructions: config.instructions || undefined,
    chunks_per_source: config.instructions ? numberValue(config.chunksPerSource, 3) : undefined,
    max_depth: numberValue(config.maxDepth, 2),
    max_breadth: numberValue(config.maxBreadth, 20),
    limit: numberValue(config.limit, 50),
    select_paths: stringArray(config.selectPaths),
    select_domains: stringArray(config.selectDomains),
    exclude_paths: stringArray(config.excludePaths),
    exclude_domains: stringArray(config.excludeDomains),
    allow_external: false,
    include_images: true,
    include_favicon: true,
    extract_depth: "advanced",
    format: "markdown",
    timeout: 150,
    include_usage: true
  });

  const response = await tavilyCrawl(payload);
  const items = normalizeUrlArray(response);
  let total = 0;
  for (const item of items) {
    if (await storePageRecord(source, run, "tavily_crawl_result", item)) {
      total += 1;
    }
  }

  return { requestPayload: payload, responsePayload: response, stats: { total } };
}
