import { z } from "zod";
import { SCRAPER_SKILL_KEYS } from "@/lib/scraper/types";

const scraperSkillSchema = z.enum(SCRAPER_SKILL_KEYS);

export const scraperAgentConfigSchema = z.object({
  goal: z.string().trim().min(1, "采集目标不能为空"),
  model: z.string().trim().optional(),
  enabledSkills: z.array(scraperSkillSchema).optional(),
  defaultInputs: z.record(z.string(), z.unknown()).optional(),
  constraints: z.object({
    maxToolCalls: z.number().int().min(1).max(100).optional(),
    allowAsync: z.boolean().optional()
  }).optional()
}).passthrough();

export const createScraperSourceSchema = z.object({
  kind: z.literal("agent"),
  name: z.string().trim().min(1, "任务名称不能为空"),
  config: scraperAgentConfigSchema
});

export const updateScraperSourceSchema = z.object({
  name: z.string().trim().min(1, "任务名称不能为空").optional(),
  enabled: z.boolean().optional(),
  config: scraperAgentConfigSchema.optional()
});
