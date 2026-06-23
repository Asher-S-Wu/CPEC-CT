import type { ScraperSkillKey } from "@/lib/scraper/types";

export const TAVILY_DOCS_URL = "https://docs.tavily.com";

type ScraperToolDefinition = {
  skillKey: ScraperSkillKey;
  toolName: string;
  description: string;
  declaration: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const siteTraversalProperties = {
  url: {
    type: "STRING",
    description: "要分析的站点根 URL"
  },
  instructions: {
    type: "STRING",
    description: "用自然语言说明要寻找哪些页面"
  },
  max_depth: {
    type: "NUMBER",
    minimum: 1,
    maximum: 5,
    description: "最大深度，1 到 5"
  },
  max_breadth: {
    type: "NUMBER",
    minimum: 1,
    maximum: 500,
    description: "每层最多跟随的链接数量"
  },
  limit: {
    type: "NUMBER",
    minimum: 1,
    description: "最多处理的链接数量"
  },
  select_paths: {
    type: "ARRAY",
    items: { type: "STRING" },
    description: "只选择符合这些正则的路径"
  },
  exclude_paths: {
    type: "ARRAY",
    items: { type: "STRING" },
    description: "排除符合这些正则的路径"
  }
};

const SKILL_DEFINITIONS: ScraperToolDefinition[] = [
  {
    skillKey: "tavily-search",
    toolName: "tavily_search",
    description: "按关键词搜索实时网页并返回相关正文片段、来源链接、图片和站点图标。",
    declaration: {
      name: "tavily_search",
      description: "使用 Tavily Search 发现未知来源。优先用于实时信息、新闻和候选网页检索。",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "搜索词" },
          topic: {
            type: "STRING",
            enum: ["general", "news", "finance"],
            description: "搜索主题"
          },
          time_range: {
            type: "STRING",
            enum: ["day", "week", "month", "year"],
            description: "时间范围"
          },
          max_results: {
            type: "NUMBER",
            minimum: 1,
            maximum: 20,
            description: "结果数量，最多 20"
          },
          include_domains: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "只搜索这些域名"
          },
          exclude_domains: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "排除这些域名"
          },
          country: {
            type: "STRING",
            description: "优先国家，使用英文国家名"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    skillKey: "tavily-extract",
    toolName: "tavily_extract",
    description: "读取一个或多个已知 URL，返回清洗后的 Markdown 正文、图片和站点图标。",
    declaration: {
      name: "tavily_extract",
      description: "使用 Tavily Extract 读取已知网页。适合从搜索结果中选择权威页面后获取正文。",
      parameters: {
        type: "OBJECT",
        properties: {
          urls: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "要读取的 URL，最多一次传入 5 个"
          },
          query: {
            type: "STRING",
            description: "可选的阅读目标，用于筛选最相关的正文片段"
          }
        },
        required: ["urls"]
      }
    }
  },
  {
    skillKey: "tavily-map",
    toolName: "tavily_map",
    description: "发现站点结构和 URL，不读取完整正文。",
    declaration: {
      name: "tavily_map",
      description: "使用 Tavily Map 摸清网站结构，为后续定向读取或批量采集选择范围。",
      parameters: {
        type: "OBJECT",
        properties: siteTraversalProperties,
        required: ["url"]
      }
    }
  },
  {
    skillKey: "tavily-crawl",
    toolName: "tavily_crawl",
    description: "在指定站点内批量发现并读取多个网页。",
    declaration: {
      name: "tavily_crawl",
      description: "使用 Tavily Crawl 批量采集同一站点内的多个页面。只有目标明确要求站点级采集时才使用。",
      parameters: {
        type: "OBJECT",
        properties: siteTraversalProperties,
        required: ["url"]
      }
    }
  }
];

export function getScraperToolDeclarations(enabledSkills?: ScraperSkillKey[]) {
  const allowed = new Set(enabledSkills?.length ? enabledSkills : SKILL_DEFINITIONS.map((item) => item.skillKey));
  return SKILL_DEFINITIONS.filter((item) => allowed.has(item.skillKey)).map((item) => item.declaration);
}

export function getScraperSkillPromptLines(enabledSkills?: ScraperSkillKey[]) {
  const allowed = new Set(enabledSkills?.length ? enabledSkills : SKILL_DEFINITIONS.map((item) => item.skillKey));
  return SKILL_DEFINITIONS.filter((item) => allowed.has(item.skillKey)).map(
    (item) => `- ${item.toolName}: ${item.description}（文档：${TAVILY_DOCS_URL}）`
  );
}

export function getScraperSkillKeyByToolName(toolName: string) {
  return SKILL_DEFINITIONS.find((item) => item.toolName === toolName)?.skillKey ?? null;
}
