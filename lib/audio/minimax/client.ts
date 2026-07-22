import { getEnv } from '@/lib/env';

const MINIMAX_BASE_URL = 'https://api.minimaxi.com';

interface MiniMaxResponse {
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  data?: {
    audio?: string;
  };
  demo_audio?: string;
  [key: string]: unknown;
}

function getApiKey(): string {
  return getEnv().minimaxApiKey;
}

function assertBaseResp(data: MiniMaxResponse, fallbackMessage: string) {
  const statusCode = data?.base_resp?.status_code;
  if (typeof statusCode === 'number' && statusCode !== 0) {
    const error = new Error(data?.base_resp?.status_msg || fallbackMessage) as Error & { statusCode?: number };
    error.statusCode = statusCode;
    throw error;
  }
}

async function parseJsonBody(text: string) {
  if (!text) return {} as MiniMaxResponse;
  try {
    return JSON.parse(text) as MiniMaxResponse;
  } catch {
    return { base_resp: { status_code: -1, status_msg: text } } as MiniMaxResponse;
  }
}

async function postRaw(path: string, bodyString: string, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${MINIMAX_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: bodyString,
      signal,
    });
  } catch (error) {
    throw new Error('无法连接 MiniMax 语音服务', { cause: error });
  }

  const data = await parseJsonBody(await response.text());

  if (!response.ok) {
    throw new Error(data?.base_resp?.status_msg || `MiniMax 请求失败（${response.status}）`);
  }

  assertBaseResp(data, `MiniMax 请求失败（${response.status}）`);
  return data;
}

function postJson(path: string, body: Record<string, unknown>, signal?: AbortSignal) {
  return postRaw(path, JSON.stringify(body), signal);
}

function toUint8Array(input: ArrayBuffer | Uint8Array | Buffer) {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

export async function downloadRemoteFile(url: string, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    throw new Error('无法下载 MiniMax 生成的音频', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`音频下载失败（${response.status}）`);
  }
  return {
    arrayBuffer: await response.arrayBuffer(),
    contentType: response.headers.get('content-type'),
  };
}

export async function synthesizeSpeech(input: {
  text: string;
  voiceId: string;
  model: string;
  languageBoost?: string;
  audioFormat?: string;
  signal?: AbortSignal;
}) {
  const data = await postJson(
    '/v1/t2a_v2',
    {
      model: input.model,
      text: input.text,
      stream: false,
      output_format: 'hex',
      language_boost: input.languageBoost || 'auto',
      voice_setting: {
        voice_id: input.voiceId,
        speed: 1,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: input.audioFormat || 'mp3',
        channel: 1,
      },
    },
    input.signal
  );

  const audioHex = data?.data?.audio;
  if (!audioHex || typeof audioHex !== 'string') {
    throw new Error('语音生成完成但未返回音频数据');
  }

  if (audioHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(audioHex)) {
    throw new Error('MiniMax 返回的音频数据格式不正确');
  }

  return {
    audioBuffer: Buffer.from(audioHex, 'hex'),
    raw: data,
  };
}

export async function uploadFile(input: {
  buffer: ArrayBuffer | Uint8Array | Buffer;
  filename: string;
  contentType: string;
  purpose: 'voice_clone' | 'prompt_audio';
  signal?: AbortSignal;
}) {
  const form = new FormData();
  form.append('purpose', input.purpose);
  form.append('file', new Blob([toUint8Array(input.buffer).buffer as ArrayBuffer], { type: input.contentType }), input.filename);

  let response: Response;
  try {
    response = await fetch(`${MINIMAX_BASE_URL}/v1/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: form,
      signal: input.signal,
    });
  } catch (error) {
    throw new Error('无法连接 MiniMax 文件服务', { cause: error });
  }

  const text = await response.text();
  const data = await parseJsonBody(text);

  if (!response.ok) {
    throw new Error(data?.base_resp?.status_msg || `音频上传失败（${response.status}）`);
  }
  assertBaseResp(data, `音频上传失败（${response.status}）`);

  // file_id 是 int64，直接 JSON.parse 可能丢失精度，这里从原始文本里按数字提取，保留完整位数
  const match = text.match(/"file_id"\s*:\s*(\d+)/);
  if (!match) {
    throw new Error('音频上传成功但未返回 file_id');
  }
  return match[1];
}

export async function cloneVoice(input: {
  fileId: string;
  voiceId: string;
  previewText?: string;
  model?: string;
  languageBoost?: string;
  promptAudioId?: string;
  promptText?: string;
  needNoiseReduction?: boolean;
  needVolumeNormalization?: boolean;
  signal?: AbortSignal;
}) {
  const FILE_ID_TOKEN = '__MINIMAX_FILE_ID__';
  const PROMPT_ID_TOKEN = '__MINIMAX_PROMPT_AUDIO_ID__';

  const body: Record<string, unknown> = {
    file_id: FILE_ID_TOKEN,
    voice_id: input.voiceId,
  };

  if (input.previewText) {
    body.text = input.previewText;
    body.model = input.model || 'speech-2.8-hd';
  }

  const hasPrompt = Boolean(input.promptAudioId && input.promptText);
  if (hasPrompt) {
    body.clone_prompt = {
      prompt_audio: PROMPT_ID_TOKEN,
      prompt_text: input.promptText,
    };
  }

  if (input.languageBoost) {
    body.language_boost = input.languageBoost;
  }
  if (input.needNoiseReduction) {
    body.need_noise_reduction = true;
  }
  if (input.needVolumeNormalization) {
    body.need_volume_normalization = true;
  }

  let bodyString = JSON.stringify(body).replace(`"${FILE_ID_TOKEN}"`, input.fileId);
  if (hasPrompt && input.promptAudioId) {
    bodyString = bodyString.replace(`"${PROMPT_ID_TOKEN}"`, input.promptAudioId);
  }

  const data = await postRaw('/v1/voice_clone', bodyString, input.signal);

  return {
    demoAudioUrl: typeof data?.demo_audio === 'string' ? data.demo_audio : '',
    raw: data,
  };
}
