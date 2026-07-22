import { ObjectId } from "mongodb";
import { storedFilesCollection } from "@/lib/db";
import type { StoredFileDescriptor, StoredFileDoc } from "@/lib/storage/types";

function toObjectId(value: string, label: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error(`${label} 无效`);
  }
  return new ObjectId(value);
}

export function buildPublicFileUrl(file: Pick<StoredFileDoc, "publicId" | "originalName">) {
  return `/files/${encodeURIComponent(file.publicId)}/${encodeURIComponent(file.originalName)}`;
}

export function toStoredFileDescriptor(file: StoredFileDoc): StoredFileDescriptor {
  return {
    fileId: file._id.toString(),
    url: buildPublicFileUrl(file),
    name: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    extension: file.extension,
    category: file.category,
  };
}

export async function insertStoredFile(
  input: Omit<StoredFileDoc, "_id" | "createdAt" | "updatedAt">
) {
  const collection = await storedFilesCollection();
  const now = new Date();
  const document: StoredFileDoc = {
    _id: new ObjectId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(document);
  return document;
}

export async function findStoredFileByPublicId(publicId: string) {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(publicId)) return null;
  return (await storedFilesCollection()).findOne({ publicId });
}

export async function findStoredFileByIdForUser(fileId: string, userId: string) {
  if (!ObjectId.isValid(fileId) || !ObjectId.isValid(userId)) return null;
  return (await storedFilesCollection()).findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });
}

export async function findStoredFilesByIdsForUser(fileIds: string[], userId: string) {
  if (!ObjectId.isValid(userId)) return [];
  const ids = Array.from(new Set(fileIds.filter((item) => ObjectId.isValid(item))));
  if (ids.length === 0) return [];
  return (await storedFilesCollection()).find({
    _id: { $in: ids.map((id) => new ObjectId(id)) },
    userId: new ObjectId(userId),
  }).toArray();
}

export async function updateStoredFileForUser(
  fileId: string,
  userId: string,
  updates: Partial<Omit<StoredFileDoc, "_id" | "publicId" | "userId" | "relativePath" | "createdAt">>
) {
  const collection = await storedFilesCollection();
  return collection.updateOne(
    { _id: toObjectId(fileId, "文件编号"), userId: toObjectId(userId, "用户编号") },
    { $set: { ...updates, updatedAt: new Date() } }
  );
}

export async function deleteStoredFileRecord(fileId: string, userId: string) {
  return (await storedFilesCollection()).findOneAndDelete({
    _id: toObjectId(fileId, "文件编号"),
    userId: toObjectId(userId, "用户编号"),
  });
}
