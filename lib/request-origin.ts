function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

export function getPublicRequestOrigin(request: Pick<Request, "headers">) {
  const host = firstHeaderValue(request.headers.get("x-forwarded-host"))
    || firstHeaderValue(request.headers.get("host"));
  const protocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));

  if (!host || protocol !== "https") {
    throw new Error("无法从 Zeabur 请求中确定 HTTPS 公开地址");
  }

  const parsed = new URL(`https://${host}`);
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Zeabur 转发的公开域名无效");
  }
  return parsed.origin;
}
