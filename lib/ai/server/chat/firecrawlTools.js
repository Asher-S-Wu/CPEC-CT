import { randomUUID } from "node:crypto";
import { WEB_BROWSING_IDENTIFIER } from "@/lib/ai/shared/webBrowsing";
import { firecrawlScrape, firecrawlSearch } from "@/lib/firecrawl/client";

const MAX_SEARCH_RESULTS = 5;
const MAX_SEARCH_CONTENT_CHARS = 8_000;
const MAX_SCRAPED_CONTENT_CHARS = 40_000;
const TIME_RANGE_TO_TBS = Object.freeze({
  day: "qdr:d",
  week: "qdr:w",
  month: "qdr:m",
  year: "qdr:y",
});

export const FIRECRAWL_CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "firecrawl_search",
      description: "使用 Firecrawl 搜索实时网页。未知来源或需要最新信息时先调用此工具。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索词" },
          source: {
            type: "string",
            enum: ["web", "news"],
            description: "搜索普通网页或新闻，默认使用 web"
          },
          time_range: {
            type: "string",
            enum: ["day", "week", "month", "year"],
            description: "可选的时间范围"
          },
          include_domains: {
            type: "array",
            items: { type: "string" },
            description: "只搜索这些域名，不能与 exclude_domains 同时使用"
          },
          exclude_domains: {
            type: "array",
            items: { type: "string" },
            description: "排除这些域名，不能与 include_domains 同时使用"
          }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "firecrawl_scrape",
      description: "使用 Firecrawl 读取一个已知网页的 Markdown 正文。只能读取搜索结果或用户明确提供的 URL。",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "要读取的网页 URL"
          },
          query: {
            type: "string",
            description: "可选的阅读目标，用于提取与问题最相关的正文"
          }
        },
        required: ["url"],
        additionalProperties: false
      }
    }
  }
];

function parseArguments(raw) {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new Error("联网工具参数不是合法 JSON");
  }
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value, max = 20) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, max)
    : [];
}

function clipText(value, maxChars) {
  const text = cleanString(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[网页正文已截断]`;
}

function readMetadata(item) {
  return asRecord(asRecord(item).metadata);
}

function readResultUrl(item) {
  const record = asRecord(item);
  const metadata = readMetadata(record);
  return cleanString(record.url)
    || cleanString(metadata.sourceURL)
    || cleanString(metadata.url);
}

function readResultTitle(item, url) {
  const record = asRecord(item);
  const metadata = readMetadata(record);
  return cleanString(record.title)
    || cleanString(metadata.title)
    || cleanString(metadata.ogTitle)
    || url;
}

function normalizeSearchResults(response, source) {
  const items = source === "news"
    ? (Array.isArray(response?.news) ? response.news : [])
    : (Array.isArray(response?.web) ? response.web : []);

  return items.slice(0, MAX_SEARCH_RESULTS).map((item) => {
    const record = asRecord(item);
    const metadata = readMetadata(record);
    const url = readResultUrl(record);
    const content = cleanString(record.description)
      || cleanString(record.snippet)
      || cleanString(record.highlights)
      || cleanString(record.markdown)
      || cleanString(metadata.description)
      || cleanString(metadata.ogDescription);
    return {
      title: readResultTitle(record, url),
      url,
      content: clipText(content, MAX_SEARCH_CONTENT_CHARS),
      score: null,
      favicon: cleanString(metadata.favicon),
      images: Array.isArray(record.images) ? record.images : []
    };
  }).filter((item) => item.url);
}

function normalizeScrapeResult(document, requestedUrl, query) {
  const record = asRecord(document);
  const metadata = readMetadata(record);
  const url = readResultUrl(record) || requestedUrl;
  const focusedContent = query ? cleanString(record.highlights) : "";
  const markdown = cleanString(record.markdown);
  const content = focusedContent || markdown || cleanString(record.summary);
  return [{
    title: readResultTitle(record, url),
    url,
    content: clipText(content, MAX_SCRAPED_CONTENT_CHARS),
    score: null,
    favicon: cleanString(metadata.favicon),
    images: Array.isArray(record.images) ? record.images : []
  }];
}

function buildCitations(results) {
  return results.map((item) => ({
    url: item.url,
    title: item.title || item.url,
    favicon: item.favicon || ""
  }));
}

function buildToolRecord({ call, apiName, args, results }) {
  return {
    id: typeof call?.id === "string" && call.id ? call.id : randomUUID(),
    identifier: WEB_BROWSING_IDENTIFIER,
    apiName,
    type: "function",
    status: "success",
    title: apiName === "search" ? "Firecrawl 联网搜索" : "Firecrawl 网页阅读",
    arguments: args,
    state: { results },
    citations: buildCitations(results),
    finishedAt: new Date().toISOString()
  };
}

function normalizeWebUrl(value) {
  const url = cleanString(value);
  if (!url) throw new Error("网页链接不能为空");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("网页链接格式无效");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("网页链接必须使用 HTTP 或 HTTPS");
  }
  return parsed.toString();
}

export async function executeFirecrawlChatTool(call) {
  const name = call?.function?.name;
  const args = parseArguments(call?.function?.arguments);

  if (name === "firecrawl_search") {
    const query = cleanString(args.query);
    if (!query) throw new Error("联网搜索词不能为空");
    const source = args.source === undefined ? "web" : cleanString(args.source);
    if (source !== "web" && source !== "news") throw new Error("联网搜索来源无效");
    const timeRange = cleanString(args.time_range);
    if (timeRange && !TIME_RANGE_TO_TBS[timeRange]) throw new Error("联网搜索时间范围无效");
    const includeDomains = stringArray(args.include_domains);
    const excludeDomains = stringArray(args.exclude_domains);
    if (includeDomains.length > 0 && excludeDomains.length > 0) {
      throw new Error("不能同时指定包含域名和排除域名");
    }

    const response = await firecrawlSearch(query, {
      sources: [source],
      limit: MAX_SEARCH_RESULTS,
      ignoreInvalidURLs: true,
      highlights: true,
      ...(timeRange ? { tbs: TIME_RANGE_TO_TBS[timeRange] } : {}),
      ...(includeDomains.length > 0 ? { includeDomains } : {}),
      ...(excludeDomains.length > 0 ? { excludeDomains } : {}),
    });
    const results = normalizeSearchResults(response, source);
    const normalizedArgs = {
      query,
      source,
      ...(timeRange ? { time_range: timeRange } : {}),
      ...(includeDomains.length > 0 ? { include_domains: includeDomains } : {}),
      ...(excludeDomains.length > 0 ? { exclude_domains: excludeDomains } : {}),
    };
    return {
      apiName: "search",
      args: normalizedArgs,
      results,
      citations: buildCitations(results),
      modelResult: {
        query,
        source,
        results: results.map((item) => ({
          title: item.title,
          url: item.url,
          content: item.content,
        }))
      },
      tool: buildToolRecord({ call, apiName: "search", args: normalizedArgs, results })
    };
  }

  if (name === "firecrawl_scrape") {
    const url = normalizeWebUrl(args.url);
    const query = cleanString(args.query);
    const document = await firecrawlScrape(url, {
      formats: [
        "markdown",
        "images",
        ...(query ? [{ type: "highlights", query }] : []),
      ],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
    });
    const results = normalizeScrapeResult(document, url, query);
    const normalizedArgs = { url, ...(query ? { query } : {}) };
    return {
      apiName: "scrape",
      args: normalizedArgs,
      results,
      citations: buildCitations(results),
      modelResult: {
        results: results.map((item) => ({
          title: item.title,
          url: item.url,
          content: item.content,
        }))
      },
      tool: buildToolRecord({ call, apiName: "scrape", args: normalizedArgs, results })
    };
  }

  throw new Error("不支持这个联网工具");
}
