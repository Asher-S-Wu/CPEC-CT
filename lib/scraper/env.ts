function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value.trim();
}

export function getScraperXcrawlEnv() {
  return {
    apiKey: readRequiredEnv("XCRAWL_API_KEY")
  };
}

export function getScraperModelEnv() {
  return {
    apiKey: readRequiredEnv("ZENMUX_API_KEY"),
    model: "google/gemini-3.5-flash"
  };
}
