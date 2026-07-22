import type { SubtitleSentence } from '@/lib/audio/subtitle/format';
import { createAsrTask, queryAsrTask } from '@/lib/audio/bailian/client';
import { extractFirstUrl } from '@/lib/ai/server/bailian/dashscope';

const LANGUAGE_MAP = {
  zh: 'zh',
  en: 'en',
  ja: 'ja',
} as const;

type RecognitionLanguage = 'auto' | keyof typeof LANGUAGE_MAP;
type RecognitionMode = 'text' | 'subtitle';
type AudioFormat = 'mp3' | 'wav' | 'ogg';
type PayloadPath = ReadonlyArray<string | number>;

interface CreateRecognitionTaskInput {
  fileUrl: string;
  fileName: string;
  mode: RecognitionMode;
  language: RecognitionLanguage;
  enableItn: boolean;
  enablePunc: boolean;
  enableDdc: boolean;
  enableSpeakerInfo: boolean;
  hotwords?: string[];
  signal?: AbortSignal;
}

interface BailianAsrSuccessResult {
  taskId: string;
  logId?: string;
  text?: string;
  sentences: SubtitleSentence[];
  durationMs: number;
}

class BailianAsrError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function getAudioFormat(fileName: string): AudioFormat {
  const extension = fileName.toLowerCase().split('.').pop();

  if (extension === 'mp3' || extension === 'wav' || extension === 'ogg') {
    return extension;
  }

  throw new BailianAsrError('仅支持 mp3、wav、ogg 音频文件', 400);
}

function getLanguage(language: RecognitionLanguage): string | undefined {
  if (language === 'auto') {
    return undefined;
  }

  return LANGUAGE_MAP[language];
}

function normalizeHotwords(hotwords?: string[]) {
  if (!Array.isArray(hotwords)) return undefined;
  const words = hotwords
    .map((word) => (typeof word === 'string' ? word.trim() : ''))
    .filter(Boolean)
    .slice(0, 200);
  return words.length > 0 ? words : undefined;
}

function readPayloadPath(payload: unknown, path: PayloadPath): unknown {
  let current = payload;

  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
      continue;
    }

    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function firstPayloadValue(payload: unknown, paths: ReadonlyArray<PayloadPath>): unknown {
  for (const path of paths) {
    const value = readPayloadPath(payload, path);
    if (value) return value;
  }
  return undefined;
}

function normalizeSentence(item: unknown): SubtitleSentence {
  const begin = firstPayloadValue(item, [['begin_time'], ['start_time'], ['start']]) ?? 0;
  const end = firstPayloadValue(item, [['end_time'], ['end']]) ?? 0;
  const speaker = firstPayloadValue(item, [['speaker_id'], ['speaker'], ['speakerId']]);
  const text = readPayloadPath(item, ['text']);

  return {
    begin_time: Number(begin) || 0,
    end_time: Number(end) || 0,
    text: typeof text === 'string' ? text.trim() : '',
    speaker_id: Number.isFinite(Number(speaker)) ? Number(speaker) : undefined,
  };
}

function collectSentences(payload: unknown): SubtitleSentence[] {
  const candidates = [
    readPayloadPath(payload, ['sentences']),
    readPayloadPath(payload, ['transcripts', 0, 'sentences']),
    readPayloadPath(payload, ['results', 0, 'sentences']),
    readPayloadPath(payload, ['output', 'sentences']),
    readPayloadPath(payload, ['output', 'results', 0, 'sentences']),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeSentence).filter((sentence) => sentence.text);
    }
  }

  const text = firstPayloadValue(payload, [
    ['text'],
    ['transcripts', 0, 'text'],
    ['results', 0, 'text'],
    ['output', 'text'],
    ['output', 'results', 0, 'text'],
  ]);

  return typeof text === 'string' && text.trim()
    ? [{ begin_time: 0, end_time: 0, text: text.trim() }]
    : [];
}

function getDuration(payload: unknown) {
  const value = firstPayloadValue(payload, [
    ['duration'],
    ['audio_duration'],
    ['audio_info', 'duration'],
    ['transcripts', 0, 'duration'],
    ['output', 'duration'],
  ]);
  return Number(value) || 0;
}

async function fetchTranscriptionPayload(taskPayload: unknown, signal?: AbortSignal): Promise<unknown> {
  const directUrl = firstPayloadValue(taskPayload, [
    ['output', 'results', 0, 'transcription_url'],
    ['output', 'transcription_url'],
    ['results', 0, 'transcription_url'],
  ]);
  const url = typeof directUrl === 'string'
    ? directUrl
    : extractFirstUrl(readPayloadPath(taskPayload, ['output']));

  if (!url) return taskPayload;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new BailianAsrError('识别结果下载失败', 502);
  }

  return (await response.json()) as unknown;
}

export function isBailianAsrError(error: unknown): error is BailianAsrError {
  return error instanceof BailianAsrError;
}

export async function createRecognitionTask(input: CreateRecognitionTaskInput): Promise<BailianAsrSuccessResult> {
  getAudioFormat(input.fileName);
  const speakerInfoEnabled = input.mode === 'subtitle' && input.enableSpeakerInfo;
  const language = getLanguage(input.language);

  if (speakerInfoEnabled && input.language !== 'auto' && input.language !== 'zh') {
    throw new BailianAsrError('说话人识别仅支持自动或中文识别', 400);
  }

  const taskId = await createAsrTask({
    fileUrl: input.fileUrl,
    language,
    enableItn: input.enableItn,
    enablePunc: input.enablePunc,
    enableDdc: input.enableDdc,
    enableSpeakerInfo: speakerInfoEnabled,
    hotwords: normalizeHotwords(input.hotwords),
    signal: input.signal,
  });

  const taskPayload = await queryAsrTask(taskId, input.signal);
  const resultPayload = await fetchTranscriptionPayload(taskPayload, input.signal);
  const sentences = collectSentences(resultPayload);
  const logId = readPayloadPath(taskPayload, ['request_id']);

  return {
    taskId,
    logId: typeof logId === 'string' ? logId : undefined,
    text: sentences.map((sentence) => sentence.text).join(''),
    durationMs: getDuration(resultPayload),
    sentences,
  };
}
