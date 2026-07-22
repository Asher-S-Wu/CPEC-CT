import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/audio/auth/session';
import { TTSHistoryRepository } from '@/lib/audio/mongodb/repositories';
import { DEFAULT_TTS_VOICE } from '@/lib/audio/client/tts-options';
import { logError } from '@/lib/logger';
import { findStoredFileByIdForUser, toStoredFileDescriptor } from '@/lib/storage/repository';

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
    const { voiceId, text, audioFileId, model, parameters } = body;

    if (!text || !audioFileId || !model) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    const audioFile = await findStoredFileByIdForUser(String(audioFileId), session.userId);
    if (!audioFile || audioFile.category !== 'audio' || audioFile.scope !== 'tts') {
      return NextResponse.json(
        { success: false, message: '音频文件不存在或无权访问' },
        { status: 404 }
      );
    }
    const audioDescriptor = toStoredFileDescriptor(audioFile);

    await TTSHistoryRepository.create({
      userId: session.userId,
      voiceId: voiceId || DEFAULT_TTS_VOICE,
      text,
      audioFileId: audioDescriptor.fileId,
      audioUrl: audioDescriptor.url,
      model,
      parameters: parameters || {},
    });

    return NextResponse.json({
      success: true,
      message: '保存成功',
    });
  } catch (error) {
    logError('audio.tts-history', 'save history', error);
    return NextResponse.json(
      { success: false, message: '保存失败' },
      { status: 500 }
    );
  }
}
