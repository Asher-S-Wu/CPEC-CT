import { injectCurrentTimeSystemReminder } from "@/app/api/ai/chat/utils";
import { buildWebSearchGuide } from "@/lib/ai/server/chat/webSearchConfig";

const TOOL_LOOP_FINAL_ANSWER_TEXT = [
  "The web browsing phase for this turn is complete.",
  "Use the tool results already gathered in this response chain to answer the user now.",
  "Do not call more tools and do not ask for more browsing.",
].join(" ");

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

export function buildForcedFinalAnswerInstructions(baseInstructions) {
  const trimmed = typeof baseInstructions === "string" ? baseInstructions.trim() : "";
  return [trimmed, TOOL_LOOP_FINAL_ANSWER_TEXT]
    .filter((item) => typeof item === "string" && item.trim())
    .join("\n\n");
}
