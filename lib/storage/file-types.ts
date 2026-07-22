const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "json", "py", "js", "mjs", "cjs", "ts", "tsx", "jsx",
  "html", "css", "xml", "yml", "yaml", "sql", "sh", "log", "ini", "conf", "csv",
]);

function startsWithBytes(buffer: Buffer, bytes: number[]) {
  return bytes.every((value, index) => buffer[index] === value);
}

function hasAsciiAt(buffer: Buffer, value: string, offset: number) {
  return buffer.subarray(offset, offset + value.length).toString("ascii") === value;
}

function isIsoBaseMedia(buffer: Buffer) {
  return buffer.length >= 12 && hasAsciiAt(buffer, "ftyp", 4);
}

export function matchesFileSignature(extension: string, header: Buffer) {
  const ext = extension.toLowerCase();
  if (header.length === 0) return false;

  if (TEXT_EXTENSIONS.has(ext)) {
    return !header.subarray(0, 4096).includes(0);
  }

  switch (ext) {
    case "jpg":
    case "jpeg":
      return startsWithBytes(header, [0xff, 0xd8, 0xff]);
    case "png":
      return startsWithBytes(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "gif":
      return hasAsciiAt(header, "GIF87a", 0) || hasAsciiAt(header, "GIF89a", 0);
    case "webp":
      return hasAsciiAt(header, "RIFF", 0) && hasAsciiAt(header, "WEBP", 8);
    case "pdf":
      return hasAsciiAt(header, "%PDF-", 0);
    case "docx":
    case "xlsx":
      return startsWithBytes(header, [0x50, 0x4b, 0x03, 0x04]);
    case "doc":
    case "xls":
      return startsWithBytes(header, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case "mp3":
      return hasAsciiAt(header, "ID3", 0) || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
    case "wav":
      return hasAsciiAt(header, "RIFF", 0) && hasAsciiAt(header, "WAVE", 8);
    case "ogg":
      return hasAsciiAt(header, "OggS", 0);
    case "m4a":
    case "mp4":
    case "mov":
    case "m4v":
      return isIsoBaseMedia(header);
    case "aac":
      return header[0] === 0xff && (header[1] & 0xf6) === 0xf0;
    case "webm":
    case "weba":
      return startsWithBytes(header, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}
