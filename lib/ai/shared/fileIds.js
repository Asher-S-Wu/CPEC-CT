const FILE_ID_PATTERN = /^[a-f\d]{24}$/i;

export function normalizeFileId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || !FILE_ID_PATTERN.test(normalized)) return null;
  return normalized;
}

