import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/audio/auth/session';
import { cloneVoice, downloadRemoteFile, uploadFile } from '@/lib/audio/minimax/client';
import { fetchPrivateBlob } from '@/lib/audio/blob';
import { VoiceRepository } from '@/lib/audio/mongodb/repositories';
import { buildAudioBlobUrl, isPrivateBlobUrl, saveAudioBuffer } from '@/lib/audio/storage';
import { CLONE_PREVIEW_MODEL, DEFAULT_TTS_MODEL } from '@/lib/audio/client/tts-options';
import { logError } from '@/lib/logger';

const VOICE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{6,254}[A-Za-z0-9]$/;

function extFromContentType(contentType: string | null): 'mp3' | 'm4a' | 'wav' {
  const value = (contentType || '').toLowerCase();
  if (value.includes('wav') || value.includes('wave')) return 'wav';
  if (value.includes('mp4') || value.includes('m4a')) return 'm4a';
  return 'mp3';
}

async function uploadBlobToMiniMax(
  blobUrl: string,
  purpose: 'voice_clone' | 'prompt_audio',
  filePrefix: string,
  signal?: AbortSignal
) {
  const response = await fetchPrivateBlob(blobUrl);
  if (!response.ok) {
    throw new Error('无法读取已上传的音频文件');
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const ext = extFromContentType(contentType);

  return uploadFile({
    buffer: arrayBuffer,
    filename: `${filePrefix}.${ext}`,
    contentType,
    purpose,
    signal,
  });
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
      sourceBlobUrl,
      voiceId,
      name,
      description,
      previewText,
      language,
      promptBlobUrl,
      promptText,
    } = body;

    if (!sourceBlobUrl || !voiceId || !name) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (typeof sourceBlobUrl !== 'string' || !isPrivateBlobUrl(sourceBlobUrl)) {
      return NextResponse.json(
        { success: false, message: '无效的音频地址' },
        { status: 400 }
      );
    }

    if (typeof voiceId !== 'string' || !VOICE_ID_PATTERN.test(voiceId)) {
      return NextResponse.json(
        { success: false, message: '声音 ID 格式不正确' },
        { status: 400 }
      );
    }

    const hasPrompt = typeof promptBlobUrl === 'string' && promptBlobUrl && typeof promptText === 'string' && promptText.trim();
    if (hasPrompt && !isPrivateBlobUrl(promptBlobUrl)) {
      return NextResponse.json(
        { success: false, message: '无效的示例音频地址' },
        { status: 400 }
      );
    }

    const fileId = await uploadBlobToMiniMax(sourceBlobUrl, 'voice_clone', 'clone-source', request?.signal);

    let promptAudioId: string | undefined;
    if (hasPrompt) {
      promptAudioId = await uploadBlobToMiniMax(promptBlobUrl, 'prompt_audio', 'clone-prompt', request?.signal);
    }

    const trimmedPreview = typeof previewText === 'string' ? previewText.trim() : '';
    const cloneResult = await cloneVoice({
      fileId,
      voiceId,
      previewText: trimmedPreview || undefined,
      model: trimmedPreview ? CLONE_PREVIEW_MODEL : undefined,
      languageBoost: 'auto',
      promptAudioId,
      promptText: hasPrompt ? promptText.trim() : undefined,
      signal: request?.signal,
    });

    let previewAudioUrl = '';
    if (cloneResult.demoAudioUrl) {
      const downloaded = await downloadRemoteFile(cloneResult.demoAudioUrl, request?.signal);
      const saved = await saveAudioBuffer(
        downloaded.arrayBuffer,
        'audio/mpeg',
        'voice-clone-preview'
      );
      previewAudioUrl = saved.url;
    }

    const insertedId = await VoiceRepository.create({
      userId: session.userId,
      voiceId,
      name,
      description,
      sourceAudioUrl: buildAudioBlobUrl(sourceBlobUrl),
      promptText: hasPrompt ? promptText.trim() : undefined,
      model: DEFAULT_TTS_MODEL,
      provider: 'minimax',
      previewAudioUrl: previewAudioUrl || undefined,
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
