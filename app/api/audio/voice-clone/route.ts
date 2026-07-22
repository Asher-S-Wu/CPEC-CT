import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/audio/auth/session';
import { cloneVoice, downloadRemoteFile, uploadFile } from '@/lib/audio/minimax/client';
import { VoiceRepository } from '@/lib/audio/mongodb/repositories';
import { saveAudioBuffer } from '@/lib/audio/storage';
import { CLONE_PREVIEW_MODEL, DEFAULT_TTS_MODEL } from '@/lib/audio/client/tts-options';
import { logError } from '@/lib/logger';
import { readStoredFileBufferForUser } from '@/lib/storage/server';
import { toStoredFileDescriptor } from '@/lib/storage/repository';

const VOICE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{6,254}[A-Za-z0-9]$/;

async function uploadStoredAudioToMiniMax(
  storedFileId: string,
  userId: string,
  purpose: 'voice_clone' | 'prompt_audio',
  filePrefix: string,
  signal?: AbortSignal
) {
  const resolved = await readStoredFileBufferForUser(storedFileId, userId, 20 * 1024 * 1024);
  if (resolved.file.category !== 'audio' || resolved.file.scope !== 'voice') {
    throw new Error('音频文件不存在或无权访问');
  }
  const providerFileId = await uploadFile({
    buffer: resolved.buffer,
    filename: `${filePrefix}.${resolved.file.extension}`,
    contentType: resolved.file.mimeType,
    purpose,
    signal,
  });
  return { providerFileId, storedFile: resolved.file };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      sourceFileId,
      voiceId,
      name,
      description,
      previewText,
      language,
      promptFileId,
      promptText,
    } = body;

    if (!sourceFileId || !voiceId || !name) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (typeof sourceFileId !== 'string') {
      return NextResponse.json(
        { success: false, message: '无效的音频文件' },
        { status: 400 }
      );
    }

    if (typeof voiceId !== 'string' || !VOICE_ID_PATTERN.test(voiceId)) {
      return NextResponse.json(
        { success: false, message: '声音 ID 格式不正确' },
        { status: 400 }
      );
    }

    const normalizedPromptFileId = typeof promptFileId === 'string' ? promptFileId.trim() : '';
    const normalizedPromptText = typeof promptText === 'string' ? promptText.trim() : '';
    const hasPrompt = Boolean(normalizedPromptFileId && normalizedPromptText);

    const sourceUpload = await uploadStoredAudioToMiniMax(
      sourceFileId,
      session.userId,
      'voice_clone',
      'clone-source',
      request.signal
    );

    let promptAudioId: string | undefined;
    let promptStoredFile: typeof sourceUpload.storedFile | undefined;
    if (hasPrompt) {
      const promptUpload = await uploadStoredAudioToMiniMax(
        normalizedPromptFileId,
        session.userId,
        'prompt_audio',
        'clone-prompt',
        request.signal
      );
      promptAudioId = promptUpload.providerFileId;
      promptStoredFile = promptUpload.storedFile;
    }

    const trimmedPreview = typeof previewText === 'string' ? previewText.trim() : '';
    const cloneResult = await cloneVoice({
      fileId: sourceUpload.providerFileId,
      voiceId,
      previewText: trimmedPreview || undefined,
      model: trimmedPreview ? CLONE_PREVIEW_MODEL : undefined,
      languageBoost: 'auto',
      promptAudioId,
      promptText: hasPrompt ? normalizedPromptText : undefined,
      signal: request?.signal,
    });

    let previewAudioUrl = '';
    let previewFileId = '';
    if (cloneResult.demoAudioUrl) {
      const downloaded = await downloadRemoteFile(cloneResult.demoAudioUrl, request?.signal);
      const saved = await saveAudioBuffer(
        session.userId,
        downloaded.arrayBuffer,
        'audio/mpeg',
        'voice-clone-preview'
      );
      previewAudioUrl = saved.url;
      previewFileId = saved.fileId;
    }

    const insertedId = await VoiceRepository.create({
      userId: session.userId,
      voiceId,
      name,
      description,
      sourceFileId: sourceUpload.storedFile._id.toString(),
      sourceAudioUrl: toStoredFileDescriptor(sourceUpload.storedFile).url,
      promptFileId: promptStoredFile?._id.toString(),
      promptAudioUrl: promptStoredFile ? toStoredFileDescriptor(promptStoredFile).url : undefined,
      promptText: hasPrompt ? normalizedPromptText : undefined,
      model: DEFAULT_TTS_MODEL,
      provider: 'minimax',
      previewAudioUrl: previewAudioUrl || undefined,
      previewFileId: previewFileId || undefined,
      language: language || 'zh',
    });

    return NextResponse.json({
      success: true,
      message: '声音复刻成功',
      data: {
        id: insertedId.toString(),
        previewAudio: previewAudioUrl || undefined,
      },
    });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 2038) {
      return NextResponse.json(
        { success: false, message: '当前账号未开通声音复刻权限，请先在 MiniMax 平台完成实名或企业认证' },
        { status: 403 }
      );
    }

    logError('audio.voice-clone', 'clone voice', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || '声音复刻失败' },
      { status: 500 }
    );
  }
}
