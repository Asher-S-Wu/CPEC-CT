import { Firecrawl, SdkError } from "firecrawl";
import type { ScrapeOptions, SearchRequest } from "firecrawl";
import { getEnv } from "@/lib/env";

const FIRECRAWL_REQUEST_TIMEOUT_MS = 60_000;

let client: Firecrawl | null = null;

export class FirecrawlRequestError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options: { status?: number; code?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "FirecrawlRequestError";
    this.status = options.status;
    this.code = options.code;
  }
}

function getFirecrawlClient() {
  client ||= new Firecrawl({
    apiKey: getEnv().firecrawlApiKey,
    timeoutMs: FIRECRAWL_REQUEST_TIMEOUT_MS + 5_000,
    maxRetries: 1,
  });
  return client;
}

function toRequestError(error: unknown) {
  if (error instanceof FirecrawlRequestError) return error;

  if (error instanceof SdkError) {
    let message = error.message.trim()
      ? `Firecrawl 请求失败：${error.message.trim()}`
      : "Firecrawl 请求失败";
    if (error.status === 401 || error.status === 403) {
      message = "Firecrawl API Key 无效或没有访问权限";
    } else if (error.status === 402) {
      message = "Firecrawl 账户额度不足";
    } else if (error.status === 429) {
      message = "Firecrawl 请求过于频繁";
    }
    return new FirecrawlRequestError(message, {
      status: error.status,
      code: error.code,
      cause: error,
    });
  }

  return new FirecrawlRequestError("Firecrawl 请求失败", { cause: error });
}

async function runFirecrawlRequest<T>(request: () => Promise<T>) {
  try {
    return await request();
  } catch (error) {
    throw toRequestError(error);
  }
}

export function firecrawlSearch(
  query: string,
  options: Omit<SearchRequest, "query" | "timeout"> = {}
) {
  return runFirecrawlRequest(() => getFirecrawlClient().search(query, {
    ...options,
    timeout: FIRECRAWL_REQUEST_TIMEOUT_MS,
  }));
}

export function firecrawlScrape(
  url: string,
  options: Omit<ScrapeOptions, "timeout"> = {}
) {
  return runFirecrawlRequest(() => getFirecrawlClient().scrape(url, {
    ...options,
    timeout: FIRECRAWL_REQUEST_TIMEOUT_MS,
  }));
}
