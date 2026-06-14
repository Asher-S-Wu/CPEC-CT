import { injectCurrentTimeSystemReminder } from "@/app/api/ai/chat/utils";
import { buildWebSearchGuide } from "@/lib/ai/server/chat/webSearchConfig";

export async function buildDirectChatSystemPrompt({
  userSystemPrompt,
  systemPromptSuffix,
  enableWebSearch,
  searchContextSection,
} = {}) {
  const preReminderPrompt = [
    typeof userSystemPrompt === "string" ? userSystemPrompt : "",
    systemPromptSuffix,
  ]
    .filter((item) => typeof item === "string" && item.trim())
    .join("\n\n");
  const webSearchGuide = buildWebSearchGuide(enableWebSearch).trim();
  const stableSystemPrompt = [
    preReminderPrompt,
    webSearchGuide,
    searchContextSection,
  ]
    .filter((item) => typeof item === "string" && item.trim())
    .join("\n\n");

  return injectCurrentTimeSystemReminder(stableSystemPrompt);
}
