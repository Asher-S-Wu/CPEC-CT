import { ConversationStore as Conversation, isValidObjectId } from "@/lib/ai/server/store";
import { sanitizeConversationBody } from "@/lib/ai/server/conversations/sanitize";
import { enrichStoredMessagesWithBlobIds } from "@/lib/ai/server/conversations/blobReferences";
import { DEFAULT_MODEL } from "@/lib/ai/shared/models";

const LEGACY_TEXT_MODEL = ["Mini", "Max-M3"].join("");
const LEGACY_IMAGE_MODEL = ["image", "01"].join("-");
const LEGACY_QWEN_MODEL = "qwen3.7-plus";
const LEGACY_WAN_MODEL = "wan2.7-image-pro";

export function isValidConversationId(id) {
  return isValidObjectId(id);
}

export async function migrateLegacyConversationModelsForUser(userId) {
  await Promise.all([
    Conversation.updateMany({ userId, model: LEGACY_TEXT_MODEL }, { $set: { model: DEFAULT_MODEL } }),
    Conversation.updateMany({ userId, model: LEGACY_IMAGE_MODEL }, { $set: { model: DEFAULT_MODEL } }),
    Conversation.updateMany({ userId, model: LEGACY_QWEN_MODEL }, { $set: { model: DEFAULT_MODEL } }),
    Conversation.updateMany({ userId, model: LEGACY_WAN_MODEL }, { $set: { model: DEFAULT_MODEL } }),
  ]);
}

export async function getConversationForUser(id, userId) {
  await migrateLegacyConversationModelsForUser(userId);
  return Conversation.findOne({ _id: id, userId }).lean();
}

export async function deleteConversationForUser(id, userId) {
  await Conversation.deleteOne({ _id: id, userId });
}

export async function updateConversationForUser(id, userId, body) {
  const currentConversation = await Conversation.findOne({ _id: id, userId }).select("model");
  if (!currentConversation) {
    return null;
  }

  const update = sanitizeConversationBody(body);
  if (Array.isArray(update.messages) && update.messages.length > 0) {
    update.messages = await enrichStoredMessagesWithBlobIds(update.messages, { userId });
  }

  if (Object.keys(update).length === 0) {
    return Conversation.findOne({ _id: id, userId });
  }
  return Conversation.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { new: true }
  );
}
