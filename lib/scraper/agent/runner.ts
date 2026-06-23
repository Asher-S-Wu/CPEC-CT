import {
  normalizeUrlArray,
  pickBestTitle,
  pickBestUrl
} from "@/lib/scraper/source-runners/helpers";
import { getScraperModelEnv } from "@/lib/scraper/env";
import { appendFunctionResults, callZenMuxAgent, extractZenMuxFunctionCalls, extractZenMuxText, extractModelContent } from "@/lib/scraper/agent/zenmux";
import { getScraperSkillKeyByToolName, getScraperSkillPromptLines, getScraperToolDeclarations } from "@/lib/scraper/skills/registry";
import { runCrawl, runExtract, runMap, runSearch } from "@/lib/scraper/source-runners/tavily";
import { formatScraperSkillKey, SCRAPER_SKILL_KEYS, type ScraperRunDoc, type ScraperSkillKey, type ScraperSourceDoc } from "@/lib/scraper/types";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeEnabledSkills(config: Record<string, unknown>) {
  const raw = Array.isArray(config.enabledSkills) ? config.enabledSkills : [];
  const enabled = raw
    .map((item) => String(item) as ScraperSkillKey)
    .filter((item) => SCRAPER_SKILL_KEYS.includes(item));

  return enabled.length > 0 ? enabled : [...SCRAPER_SKILL_KEYS];
}

function normalizeConstraints(config: Record<string, unknown>) {
  const raw =
    config.constraints && typeof config.constraints === "object" && !Array.isArray(config.constraints)
      ? (config.constraints as Record<string, unknown>)
      : {};

  return {
    maxToolCalls: numberValue(raw.maxToolCalls, 50)
  };
}

function buildAgentPrompt(source: ScraperSourceDoc) {
  const config = (source.config || {}) as Record<string, unknown>;
  const goal = text(config.goal);
  if (!goal) {
    throw new Error("请先为采集任务设定目标");
  }

  const enabledSkills = normalizeEnabledSkills(config);
  const constraints = normalizeConstraints(config);
  const defaultInputs =
    config.defaultInputs && typeof config.defaultInputs === "object" && !Array.isArray(config.defaultInputs)
      ? (config.defaultInputs as Record<string, unknown>)
      : {};

  return {
    enabledSkills,
    constraints,
    prompt: [
      "你是 CPEC 的网页采集代理，需要通过 Tavily 完成网页发现、读取和入库。",
      "你必须严格按技能边界选工具，不要把 Search、Extract、Map、Crawl 混着使用。",
      "技能路由规则：",
      ...getScraperSkillPromptLines(enabledSkills),
      "执行规则：",
      `- 本次最大工具调用步数：${constraints.maxToolCalls}。系统会在每次请求时告知你剩余步数。`,
      "- 当剩余步数 ≤ 2 时，你应当停止调用新工具，立即根据已获取的结果整理并输出最终中文结论。",
      "- 如果已经获得足够结果，就停止继续调工具，直接输出中文结论。",
      "- 已知 URL 时使用 Extract；未知来源时先 Search；需要了解站点结构时使用 Map。",
      "- 除非目标明确要求大范围站点批量抓取，否则不要动用 crawl。",
      "",
      `任务名称：${source.name}`,
      `任务目标：${goal}`,
      `默认输入：${JSON.stringify(defaultInputs)}`,
      `约束：${JSON.stringify(config.constraints || {})}`,
      "",
      "最终答复要求：用中文说明用了哪些 skill、做了什么、拿到了什么、结果是否已写入结果库。"
    ].join("\n")
  };
}

function buildToolSource(source: ScraperSourceDoc, config: Record<string, unknown>): ScraperSourceDoc {
  return {
    ...source,
    config
  };
}

function summarizeDiscoveryResponse(payload: any) {
  return normalizeUrlArray(payload)
    .slice(0, 6)
    .map((item: any) => ({
      title: typeof item === "string" ? item : pickBestTitle(item, ""),
      url: typeof item === "string" ? item : pickBestUrl(item),
      content: typeof item?.content === "string" ? item.content.slice(0, 800) : "",
      score: typeof item?.score === "number" ? item.score : null
    }))
    .filter((item) => item.url);
}

function summarizePageResponse(payload: any) {
  return normalizeUrlArray(payload)
    .slice(0, 6)
    .map((item: any) => ({
      title: pickBestTitle(item, pickBestUrl(item)),
      url: pickBestUrl(item),
      content: typeof item?.raw_content === "string"
        ? item.raw_content.slice(0, 1200)
        : typeof item?.content === "string"
          ? item.content.slice(0, 1200)
          : ""
    }))
    .filter((item) => item.url);
}

async function executeAgentTool(input: {
  source: ScraperSourceDoc;
  run: ScraperRunDoc;
  toolName: string;
  args: Record<string, unknown>;
}) {
  const skillKey = getScraperSkillKeyByToolName(input.toolName);
  if (!skillKey) {
    throw new Error("采集过程中遇到无法识别的操作，请稍后重试");
  }

  switch (input.toolName) {
    case "tavily_search": {
      const requestConfig = {
        query: text(input.args.query),
        searchDepth: "advanced",
        chunksPerSource: 3,
        maxResults: numberValue(input.args.max_results, 5),
        topic: text(input.args.topic) || "general",
        timeRange: text(input.args.time_range),
        includeDomains: stringArray(input.args.include_domains),
        excludeDomains: stringArray(input.args.exclude_domains),
        country: text(input.args.country)
      };
      const result = await runSearch(buildToolSource(input.source, requestConfig), input.run);
      return {
        skillKey,
        requestPayload: result.requestPayload,
        responsePayload: result.responsePayload,
        modelResult: {
          ok: true,
          skill: formatScraperSkillKey(skillKey),
          records_stored: result.stats?.total ?? 0,
          items: summarizeDiscoveryResponse(result.responsePayload)
        }
      };
    }
    case "tavily_extract": {
      const requestConfig = {
        urls: stringArray(input.args.urls).slice(0, 5),
        query: text(input.args.query),
        chunksPerSource: 3
      };
      const result = await runExtract(buildToolSource(input.source, requestConfig), input.run);
      return {
        skillKey,
        requestPayload: result.requestPayload,
        responsePayload: result.responsePayload,
        modelResult: {
          ok: true,
          skill: formatScraperSkillKey(skillKey),
          records_stored: result.stats?.total ?? 0,
          pages: summarizePageResponse(result.responsePayload)
        }
      };
    }
    case "tavily_map": {
      const requestConfig = {
        url: text(input.args.url),
        instructions: text(input.args.instructions),
        maxDepth: numberValue(input.args.max_depth, 1),
        maxBreadth: numberValue(input.args.max_breadth, 20),
        limit: numberValue(input.args.limit, 50),
        selectPaths: stringArray(input.args.select_paths),
        excludePaths: stringArray(input.args.exclude_paths)
      };
      const result = await runMap(buildToolSource(input.source, requestConfig), input.run);
      return {
        skillKey,
        requestPayload: result.requestPayload,
        responsePayload: result.responsePayload,
        modelResult: {
          ok: true,
          skill: formatScraperSkillKey(skillKey),
          records_stored: result.stats?.total ?? 0,
          items: summarizeDiscoveryResponse(result.responsePayload)
        }
      };
    }
    case "tavily_crawl": {
      const requestConfig = {
        url: text(input.args.url),
        instructions: text(input.args.instructions),
        chunksPerSource: 3,
        maxDepth: numberValue(input.args.max_depth, 2),
        maxBreadth: numberValue(input.args.max_breadth, 20),
        limit: numberValue(input.args.limit, 50),
        selectPaths: stringArray(input.args.select_paths),
        excludePaths: stringArray(input.args.exclude_paths)
      };
      const result = await runCrawl(buildToolSource(input.source, requestConfig), input.run);

      return {
        skillKey,
        requestPayload: result.requestPayload,
        responsePayload: result.responsePayload,
        modelResult: {
          ok: true,
          skill: formatScraperSkillKey(skillKey),
          records_stored: result.stats?.total ?? 0,
          pages: summarizePageResponse(result.responsePayload)
        }
      };
    }
    default:
      throw new Error("采集过程中遇到不支持的操作类型");
  }
}

export type AgentProgressEvent =
  | { type: "thinking"; message: string }
  | { type: "tool_start"; toolName: string; args: Record<string, unknown>; step: number }
  | { type: "tool_done"; toolName: string; skillKey: string; result: Record<string, unknown>; step: number }
  | { type: "model_text"; text: string }
  | { type: "done"; finalText: string; stats: Record<string, unknown> }
  | { type: "error"; message: string };

export async function runAgentSource(source: ScraperSourceDoc, run: ScraperRunDoc, onProgress?: (event: AgentProgressEvent) => void) {
  const config = (source.config || {}) as Record<string, unknown>;
  const modelEnv = getScraperModelEnv();
  const promptConfig = buildAgentPrompt(source);
  const model = text(config.model) || modelEnv.model;
  const toolDeclarations = getScraperToolDeclarations(promptConfig.enabledSkills);
  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          text: promptConfig.prompt
        }
      ]
    }
  ];

  const artifacts: Array<{ artifactType: "model_request" | "model_response" | "tool_call"; payload: Record<string, unknown> }> = [
    {
      artifactType: "model_request",
      payload: {
        model,
        prompt: promptConfig.prompt,
        enabledSkills: promptConfig.enabledSkills,
        constraints: promptConfig.constraints
      }
    }
  ];

  const skillsUsed = new Set<ScraperSkillKey>();
  let toolCalls = 0;
  let finalText = "";

  const emit = onProgress || (() => {});

  const maxCalls = promptConfig.constraints.maxToolCalls;

  while (true) {
    const remaining = maxCalls - toolCalls;
    emit({ type: "thinking", message: `正在思考下一步操作…（剩余步数 ${remaining}/${maxCalls}）` });

    // 将剩余步数作为系统上下文注入，让模型实时感知配额
    if (toolCalls > 0) {
      contents.push({
        role: "user" as const,
        parts: [{ text: `[系统提示] 你已使用 ${toolCalls}/${maxCalls} 步，剩余 ${remaining} 步。${remaining <= 2 ? "步数即将耗尽，请停止调用工具，直接根据已有结果输出最终中文结论。" : ""}` }]
      });
    }

    // 步数耗尽时不传 tools，强制模型输出文本总结
    const callConfig: Record<string, unknown> = {
      apiKey: modelEnv.apiKey,
      model,
      contents
    };
    if (remaining > 0) {
      (callConfig as any).tools = [{ functionDeclarations: toolDeclarations }];
    }

    const response = await callZenMuxAgent(callConfig as any);

    artifacts.push({
      artifactType: "model_response",
      payload: response
    });

    const functionCalls = remaining > 0 ? extractZenMuxFunctionCalls(response) : [];
    if (functionCalls.length === 0) {
      finalText = extractZenMuxText(response) || "采集任务已完成。";
      emit({ type: "model_text", text: finalText });
      break;
    }

    const modelContent = extractModelContent(response);
    const functionResults: Array<{ id: string; name: string; result: Record<string, unknown> }> = [];

    for (const functionCall of functionCalls) {
      if (toolCalls >= maxCalls) {
        // 配额已耗尽，跳过剩余的函数调用
        emit({ type: "thinking", message: `步数已达上限（${maxCalls}），跳过剩余操作，准备生成总结…` });
        break;
      }

      toolCalls += 1;
      emit({ type: "tool_start", toolName: functionCall.name, args: functionCall.args, step: toolCalls });
      const execution = await executeAgentTool({
        source,
        run,
        toolName: functionCall.name,
        args: functionCall.args
      });

      skillsUsed.add(execution.skillKey);
      emit({ type: "tool_done", toolName: functionCall.name, skillKey: execution.skillKey, result: execution.modelResult, step: toolCalls });
      artifacts.push({
        artifactType: "tool_call",
        payload: {
          toolName: functionCall.name,
          args: functionCall.args,
          skillKey: execution.skillKey,
          requestPayload: execution.requestPayload,
          responsePayload: execution.responsePayload,
          modelResult: execution.modelResult
        }
      });

      functionResults.push({
        id: functionCall.id,
        name: functionCall.name,
        result: execution.modelResult
      });
    }

    // 对于模型请求了但被跳过的函数调用，补充一个拒绝响应
    for (const functionCall of functionCalls) {
      if (!functionResults.some((r) => r.id === functionCall.id)) {
        functionResults.push({
          id: functionCall.id,
          name: functionCall.name,
          result: { ok: false, error: "步数配额已耗尽，本次调用被跳过。请根据已有结果输出最终结论。" }
        });
      }
    }

    appendFunctionResults({
      contents,
      modelContent,
      results: functionResults
    });
  }

  const stats = {
    model,
    toolCalls,
    skillsUsed: Array.from(skillsUsed),
    finalText
  };

  emit({ type: "done", finalText, stats });

  return {
    requestPayload: null,
    responsePayload: null,
    artifacts,
    stats
  };
}
