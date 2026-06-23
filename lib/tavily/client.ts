const TAVILY_BASE_URL = "https://api.tavily.com";

export type TavilyResponse = Record<string, any>;

export class TavilyApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "TavilyApiError";
    this.status = status;
    this.payload = payload;
  }
}

function readTavilyApiKey() {
  const value = process.env.TAVILY_API_KEY?.trim();
  if (!value) {
    throw new Error("缺少环境变量：TAVILY_API_KEY");
  }
  return value;
}

function readErrorMessage(payload: any, status: number) {
  const candidates = [
    payload?.detail?.error,
    payload?.detail,
    payload?.message,
    payload?.error
  ];
  const message = candidates.find((item) => typeof item === "string" && item.trim());
  return message ? `Tavily 请求失败：${message.trim()}` : `Tavily 请求失败（${status}）`;
}

async function tavilyRequest(path: string, payload: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch(`${TAVILY_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${readTavilyApiKey()}`
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new TavilyApiError(readErrorMessage(data, response.status), response.status, data);
  }

  return (data || {}) as TavilyResponse;
}

export function tavilySearch(payload: Record<string, unknown>, signal?: AbortSignal) {
  return tavilyRequest("/search", payload, signal);
}

export function tavilyExtract(payload: Record<string, unknown>, signal?: AbortSignal) {
  return tavilyRequest("/extract", payload, signal);
}

export function tavilyMap(payload: Record<string, unknown>, signal?: AbortSignal) {
  return tavilyRequest("/map", payload, signal);
}

export function tavilyCrawl(payload: Record<string, unknown>, signal?: AbortSignal) {
  return tavilyRequest("/crawl", payload, signal);
}
