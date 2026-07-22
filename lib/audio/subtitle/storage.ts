import crypto from 'crypto';
import type { SubtitleSentence } from '@/lib/audio/subtitle/format';
import { saveStoredBuffer } from '@/lib/storage/server';

function sanitizeFileStem(input: string) {
  const value = String(input || '')
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return value || 'subtitle-result';
}

function buildSubtitleFilename(fileName: string) {
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');

  return `${sanitizeFileStem(fileName)}-${id}.json`;
}

function normalizeSentences(sentences: SubtitleSentence[]) {
  if (!Array.isArray(sentences)) {
    return [];
  }

  return sentences.map((sentence) => ({
    begin_time: Number(sentence?.begin_time) || 0,
    end_time: Number(sentence?.end_time) || 0,
    text: String(sentence?.text || '').trim(),
    ...(typeof sentence?.speaker_id === 'number' ? { speaker_id: sentence.speaker_id } : {}),
  }));
}

function getDurationMs(sentences: SubtitleSentence[]) {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return 0;
  }

  return Number(sentences[sentences.length - 1]?.end_time) || 0;
}

export async function saveSubtitleSentences(userId: string, sentences: SubtitleSentence[], fileName: string) {
  const normalized = normalizeSentences(sentences);
  const storedFile = await saveStoredBuffer({
    userId,
    buffer: Buffer.from(JSON.stringify(normalized), 'utf8'),
    originalName: buildSubtitleFilename(fileName),
    mimeType: 'application/json',
    extension: 'json',
    category: 'data',
    scope: 'subtitles',
    maxBytes: 20 * 1024 * 1024,
  });

  return {
    ...storedFile,
    sentenceCount: normalized.length,
    durationMs: getDurationMs(normalized),
  };
}
