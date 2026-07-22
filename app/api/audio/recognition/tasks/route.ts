import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/audio/auth/session';
import { createRecognitionTask, isBailianAsrError } from '@/lib/audio/bailian/asr';
import { saveSubtitleSentences } from '@/lib/audio/subtitle/storage';
import { logError } from '@/lib/logger';
import { toAbsoluteFileUrl } from '@/lib/ai/shared/fileUrls';
import { getPublicRequestOrigin } from '@/lib/request-origin';
import { findStoredFileByIdForUser, toStoredFileDescriptor } from '@/lib/storage/repository';

type RecognitionMode = 'text' | 'subtitle';
type RecognitionLanguage = 'auto' | 'zh' | 'en' | 'ja';

function isRecognitionMode(value: unknown): value is RecognitionMode {
  return value === 'text' || value === 'subtitle';
}

function isRecognitionLanguage(value: unknown): value is RecognitionLanguage {
  return value === 'auto' || value === 'zh' || value === 'en' || value === 'ja';
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
      fileId,
      mode,
      language,
      enableItn,
      enablePunc,
      enableDdc,
      enableSpeakerInfo,
      hotwords,
    } = body;

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json(
        { success: false, message: '缺少必要参数: fileId' },
        { status: 400 }
      );
    }

    const sourceFile = await findStoredFileByIdForUser(fileId, session.userId);
    if (!sourceFile || sourceFile.category !== 'audio' || sourceFile.scope !== 'audio-source') {
      return NextResponse.json(
        { success: false, message: '音频文件不存在或无权访问' },
        { status: 404 }
      );
    }
    const sourceDescriptor = toStoredFileDescriptor(sourceFile);
    const sourcePublicUrl = toAbsoluteFileUrl(sourceDescriptor.url, getPublicRequestOrigin(request));
    if (!sourcePublicUrl) {
      throw new Error('无法生成音频公开地址');
    }

    if (!isRecognitionMode(mode)) {
      return NextResponse.json(
        { success: false, message: '识别模式不正确' },
        { status: 400 }
      );
    }

    if (!isRecognitionLanguage(language)) {
      return NextResponse.json(
        { success: false, message: '识别语言不正确' },
        { status: 400 }
      );
    }

    const normalizedHotwords = Array.isArray(hotwords)
      ? hotwords.filter((word): word is string => typeof word === 'string')
      : undefined;

    const result = await createRecognitionTask({
      fileUrl: sourcePublicUrl,
      fileName: sourceDescriptor.name,
      mode,
      language,
      enableItn: Boolean(enableItn),
      enablePunc: Boolean(enablePunc),
      enableDdc: Boolean(enableDdc),
      enableSpeakerInfo: Boolean(enableSpeakerInfo),
      hotwords: normalizedHotwords,
      signal: request.signal,
    });

    if (result.sentences.length === 0) {
      return NextResponse.json({
        success: true,
        status: 'succeeded',
        taskId: result.taskId,
        logId: result.logId,
        message: '识别完成，但没有可用内容',
        sentencesUrl: '',
        sentenceCount: 0,
        durationMs: 0,
      });
    }

    const saved = await saveSubtitleSentences(
      session.userId,
      result.sentences,
      `subtitle-${result.taskId}`
    );

    return NextResponse.json({
      success: true,
      status: 'succeeded',
      taskId: result.taskId,
      logId: result.logId,
      sentencesUrl: saved.url,
      sentencesFileId: saved.fileId,
      sentenceCount: saved.sentenceCount,
      durationMs: saved.durationMs || result.durationMs,
    });
  } catch (error) {
    logError('audio.recognition', 'create recognition task', error);

    if (isBailianAsrError(error)) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, message: '创建任务失败' },
      { status: 500 }
    );
  }
}
