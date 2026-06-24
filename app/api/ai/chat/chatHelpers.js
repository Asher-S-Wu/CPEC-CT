import {
  isNonEmptyString,
  getStoredPartsFromMessage,
} from "@/app/api/ai/chat/utils";
import { buildAttachmentTextBlock } from "@/lib/ai/server/files/service";
import { getAttachmentInputType } from "@/lib/ai/shared/attachments";

async function storedPartToOpenAIContentPart(part, role, options = {}) {
  if (!part || typeof part !== "object") return null;

  const isAssistant = role === "assistant";

  if (isNonEmptyString(part.text)) {
    return { type: "text", text: part.text };
  }

  if (isAssistant) {
    return null;
  }

  const imageUrl = part?.inlineData?.url;
  if (isNonEmptyString(imageUrl)) {
    return {
      type: "image_url",
      image_url: { url: imageUrl },
    };
  }

  const fileUrl = part?.fileData?.url;
  if (isNonEmptyString(fileUrl)) {
    const inputType = getAttachmentInputType(part?.fileData?.category);
    if (inputType === "file") {
      const fileTextMap = options?.fileTextMap instanceof Map ? options.fileTextMap : new Map();
      const prepared = fileTextMap.get(fileUrl);
      const extractedText = prepared?.structuredText || prepared?.extractedText || "";
      if (isNonEmptyString(extractedText)) {
        return {
          type: "text",
          text: buildAttachmentTextBlock(prepared.file || part.fileData, extractedText),
        };
      }
    }
  }

  return null;
}

function normalizeOpenAIMessageContent(contentParts) {
  if (!Array.isArray(contentParts) || contentParts.length === 0) return "";
  return contentParts;
}

function getArkThinkingState(message) {
  const thinking = message?.providerState?.arkChatCompletions?.thinking;
  return thinking && typeof thinking === "object" && !Array.isArray(thinking) ? thinking : null;
}

function addArkThinkingFields(message, thinking) {
  if (!thinking) return message;
  return {
    ...message,
    ...(typeof thinking.reasoning_content === "string"
      ? { reasoning_content: thinking.reasoning_content }
      : {}),
    ...(typeof thinking.encrypted_content === "string"
      ? { encrypted_content: thinking.encrypted_content }
      : {}),
    ...(Array.isArray(thinking.reasoning_details)
      ? { reasoning_details: thinking.reasoning_details }
      : {}),
  };
}

export async function buildChatMessagesFromHistory(messages, options = {}) {
  const result = [];
  for (const msg of messages) {
    if (msg?.role !== "user" && msg?.role !== "model") continue;

    const role = msg.role === "model" ? "assistant" : "user";

    if (role === "assistant" && isNonEmptyString(msg?.content)) {
      result.push(addArkThinkingFields({
        role,
        content: msg.content,
      }, getArkThinkingState(msg)));
      continue;
    }

    const storedParts = getStoredPartsFromMessage(msg);
    if (!storedParts || storedParts.length === 0) continue;

    const contentParts = [];
    for (const storedPart of storedParts) {
      const part = await storedPartToOpenAIContentPart(storedPart, role, options);
      if (part) contentParts.push(part);
    }
    if (contentParts.length === 0) continue;

    result.push({ role, content: normalizeOpenAIMessageContent(contentParts) });
  }
  return result;
}

export async function buildCurrentUserMessage({ prompt, images, attachments, fileTextMap }) {
  const content = [];
  if (isNonEmptyString(prompt)) {
    content.push({ type: "text", text: prompt });
  }

  if (Array.isArray(images)) {
    for (const img of images) {
      if (!img?.url) continue;
      content.push({
        type: "image_url",
        image_url: { url: img.url },
      });
    }
  }

  if (Array.isArray(attachments)) {
    const map = fileTextMap instanceof Map ? fileTextMap : new Map();
    for (const attachment of attachments) {
      const prepared = map.get(attachment.url);
      const extractedText = prepared?.structuredText || prepared?.extractedText || "";
      if (!isNonEmptyString(extractedText)) continue;
      content.push({
        type: "text",
        text: buildAttachmentTextBlock(prepared.file || attachment, extractedText),
      });
    }
  }

  return content;
}

export function normalizeOpenAIMessageContentParts(contentParts) {
  return normalizeOpenAIMessageContent(contentParts);
}
