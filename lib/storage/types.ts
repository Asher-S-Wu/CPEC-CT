import type { ObjectId } from "mongodb";

export const STORAGE_SCOPES = [
  "chat",
  "avatar",
  "audio-source",
  "voice",
  "tts",
  "subtitles",
  "media-image",
  "media-video",
  "document-assets",
] as const;

export type StorageScope = (typeof STORAGE_SCOPES)[number];

export interface StoredFileDoc {
  _id: ObjectId;
  publicId: string;
  userId: ObjectId;
  relativePath: string;
  originalName: string;
  mimeType: string;
  extension: string;
  category: string;
  scope: StorageScope;
  size: number;
  sha256: string;
  parseStatus: "pending" | "processing" | "ready" | "failed";
  parseProvider?: "local-python";
  parseVersion?: number;
  parseStartedAt?: Date | null;
  parseFinishedAt?: Date | null;
  extractedText?: string | null;
  structuredText?: string | null;
  formatSummary?: string | null;
  visualAssets?: StoredVisualAsset[];
  visualAssetCount?: number;
  extractedChars?: number;
  pageCount?: number | null;
  sheetCount?: number | null;
  rowCount?: number | null;
  cellCount?: number | null;
  maxCols?: number | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredVisualAsset {
  fileId: string;
  url: string;
  mimeType: string;
  size: number;
  label: string;
  sourceType: string;
  page: number | null;
  sheet: string | null;
}

export interface StoredFileDescriptor {
  fileId: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  extension: string;
  category: string;
}
