import crypto from 'crypto';
import { put } from '@vercel/blob';

const AUDIO_MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/ogg': 'ogg',
  'application/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
};

const AUDIO_FORMAT_TO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
};

const AUDIO_BLOB_ROUTE_PREFIX = '/api/audio/blob';

function makeFilename(prefix: string, ext: string) {
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
  return `${prefix}-${id}.${ext}`;
}

function getExtFromMimeType(mimeType: string) {
  return AUDIO_MIME_TO_EXT[String(mimeType || '').toLowerCase()] || 'mp3';
}

export function getAudioMimeType(audioFormat?: string) {
  const normalized = String(audioFormat || '').trim().toLowerCase();
  return AUDIO_FORMAT_TO_MIME[normalized] || 'audio/mpeg';
}

export function isHttpUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidAudioUrl(input: string) {
  if (typeof input !== 'string') return false;
  if (input.startsWith('/api/audio/blob')) return true;
  return isHttpUrl(input);
}

export function isPrivateBlobUrl(input: string) {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      host.endsWith('.vercel-storage.com') &&
      host.includes('.private.blob.');
  } catch {
    return false;
  }
}

export function buildAudioBlobUrl(blobUrl: string) {
  const normalized = String(blobUrl || '').trim();
  return normalized
    ? `${AUDIO_BLOB_ROUTE_PREFIX}?url=${encodeURIComponent(normalized)}`
    : AUDIO_BLOB_ROUTE_PREFIX;
}

async function putAudioBlob(filename: string, buffer: Buffer, contentType: string) {
  const blob = await put(filename, buffer, {
    access: 'private',
    contentType,
  });

  return {
    url: buildAudioBlobUrl(blob.url),
    blobUrl: blob.url,
    mimeType: contentType,
  };
}

export async function saveAudioBuffer(
  input: ArrayBuffer | Uint8Array | Buffer,
  mimeType: string,
  prefix = 'audio'
) {
  const ext = getExtFromMimeType(mimeType);
  const filename = makeFilename(prefix, ext);
  let buffer: Buffer;

  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (input instanceof ArrayBuffer) {
    buffer = Buffer.from(new Uint8Array(input));
  } else {
    buffer = Buffer.from(input);
  }

  return putAudioBlob(filename, buffer, mimeType || getAudioMimeType(ext));
}
