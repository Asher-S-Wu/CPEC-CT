import { randomUUID } from "node:crypto";
import { WEB_BROWSING_IDENTIFIER } from "@/lib/ai/shared/webBrowsing";
import { tavilyExtract, tavilySearch } from "@/lib/tavily/client";

export const TAVILY_CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "tavily_search",
      description: "使用 Tavily 搜索实时网页。未知来源或需要最新信息时先调用此工具。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索词" },
          topic: {
            type: "string",
            enum: ["general", "news", "finance"],
            description: "搜索主题"
          },
          time_range: {
            type: "string",
            enum: ["day", "week", "month", "year"],
            description: "可选的时间范围"
          },
          include_domains: {
            type: "array",
            items: { type: "string" },
            description: "只搜索这些域名"
          },
          exclude_domains: {
            type: "array",
            items: { type: "string" },
            description: "排除这些域名"
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
      name: "tavily_extract",
      description: "使用 Tavily 读取已知网页的 Markdown 正文。只能读取搜索结果或用户明确提供的 URL。",
      parameters: {
        type: "object",
        properties: {
          urls: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 5,
            description: "要读取的网页 URL"
          },
          query: {
            type: "string",
            description: "可选的阅读目标，用于筛选相关正文"
          }
        },
        required: ["urls"],
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

function stringArray(value, max = 20) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, max)
    : [];
}

function normalizeSearchResults(response) {
  const results = Array.isArray(response?.results) ? response.results : [];
  return results.map((item) => ({
    title: typeof item?.title === "string" ? item.title : "",
    url: typeof item?.url === "string" ? item.url : "",
    content: typeof item?.content === "string" ? item.content : "",
    raw_content: typeof item?.raw_content === "string" ? item.raw_content : "",
    score: typeof item?.score === "number" ? item.score : null,
    favicon: typeof item?.favicon === "string" ? item.favicon : "",
    images: Array.isArray(item?.images) ? item.images : []
  })).filter((item) => item.url);
}

function normalizeExtractResults(response) {
  const results = Array.isArray(response?.results) ? response.results : [];
  return results.map((item) => ({
    title: typeof item?.title === "string" ? item.title : "",
    url: typeof item?.url === "string" ? item.url : "",
    raw_content: typeof item?.raw_content === "string" ? item.raw_content : "",
    favicon: typeof item?.favicon === "string" ? item.favicon : "",
    images: Array.isArray(item?.images) ? item.images : []
  })).filter((item) => item.url);
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
    title: apiName === "search" ? "Tavily 联网搜索" : "Tavily 网页阅读",
    arguments: args,
    state: { results },
    citations: buildCitations(results),
    finishedAt: new Date().toISOString()
  };
}

export async function executeTavilyChatTool(call, { signal } = {}) {
  const name = call?.function?.name;
  const args = parseArguments(call?.function?.arguments);

  if (name === "tavily_search") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (!query) throw new Error("联网搜索词不能为空");
    const response = await tavilySearch({
      query,
      search_depth: "advanced",
      chunks_per_source: 3,
      max_results: 5,
      topic: typeof args.topic === "string" ? args.topic : "general",
      time_range: typeof args.time_range === "string" ? args.time_range : undefined,
      include_domains: stringArray(args.include_domains),
      exclude_domains: stringArray(args.exclude_domains),
      include_answer: false,
      include_raw_content: false,
      include_images: true,
      include_image_descriptions: true,
      include_favicon: true
    }, signal);
    const results = normalizeSearchResults(response);
    return {
      apiName: "search",
      args: { ...args, query },
      results,
      citations: buildCitations(results),
      modelResult: {
        query,
        results: results.map((item) => ({
          title: item.title,
          url: item.url,
          content: item.content,
          raw_content: item.raw_content,
          score: item.score
        }))
      },
      tool: buildToolRecord({ call, apiName: "search", args: { ...args, query }, results })
    };
  }

  if (name === "tavily_extract") {
    const urls = stringArray(args.urls, 5);
    if (urls.length === 0) throw new Error("至少需要一个网页链接");
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const response = await tavilyExtract({
      urls,
      query: query || undefined,
      chunks_per_source: query ? 3 : undefined,
      extract_depth: "advanced",
      include_images: true,
      include_favicon: true,
      format: "markdown",
      timeout: 60
    }, signal);
    const results = normalizeExtractResults(response);
    return {
      apiName: "extract",
      args: { urls, ...(query ? { query } : {}) },
      results,
      citations: buildCitations(results),
      modelResult: {
        results: results.map((item) => ({
          title: item.title,
          url: item.url,
          raw_content: item.raw_content
        })),
        failed_results: Array.isArray(response?.failed_results) ? response.failed_results : []
      },
      tool: buildToolRecord({ call, apiName: "extract", args: { urls, ...(query ? { query } : {}) }, results })
    };
  }

  throw new Error("不支持这个联网工具");
}
