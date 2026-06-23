export const WebBrowsingApiName = Object.freeze({
  search: "search",
  extract: "extract",
});

export const WEB_BROWSING_IDENTIFIER = "tavily-web-browsing";

export function isWebBrowsingIdentifier(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === WEB_BROWSING_IDENTIFIER;
}

export function normalizeWebBrowsingIdentifier(value) {
  if (isWebBrowsingIdentifier(value)) return WEB_BROWSING_IDENTIFIER;
  return typeof value === "string" ? value.trim() : "";
}

export function getWebBrowsingToolTitle(apiName) {
  if (apiName === WebBrowsingApiName.search) return "联网搜索";
  if (apiName === WebBrowsingApiName.extract) return "浏览网页";
  return "联网工具";
}
