import { dashScopeRequest, getTaskId, pollDashScopeTask } from '@/lib/ai/server/bailian/dashscope';

export async function createAsrTask(input: {
  fileUrl: string;
  language?: string;
  enableItn: boolean;
  enablePunc: boolean;
  enableDdc: boolean;
  enableSpeakerInfo: boolean;
  hotwords?: string[];
  signal?: AbortSignal;
}) {
  const response = await dashScopeRequest('/services/audio/asr/transcription', {
    headers: { 'X-DashScope-Async': 'enable' },
    body: {
      model: 'fun-asr',
      input: {
        file_urls: [input.fileUrl],
      },
      parameters: {
        language_hints: input.language ? [input.language] : [],
        inverse_text_normalization_enabled: input.enableItn,
        punctuation_prediction_enabled: input.enablePunc,
        disfluency_removal_enabled: input.enableDdc,
        speaker_diarization_enabled: input.enableSpeakerInfo,
        ...(Array.isArray(input.hotwords) && input.hotwords.length > 0 ? { hotwords: input.hotwords } : {}),
      },
    },
    signal: input.signal,
  });

  const taskId = getTaskId(response);
  if (!taskId) {
    throw new Error('识别任务创建成功但缺少 task_id');
  }
  return taskId;
}

export async function queryAsrTask(taskId: string, signal?: AbortSignal) {
  return pollDashScopeTask(taskId, { signal, timeoutMs: 15 * 60 * 1000 });
}
