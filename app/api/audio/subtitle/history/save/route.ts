import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/audio/auth/session';
import { SubtitleHistoryRepository } from '@/lib/audio/mongodb/repositories';
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
    const { fileId, sentencesFileId, sentenceCount, durationMs } = body;

    if (!fileId || !sentencesFileId) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    const [sourceFile, sentencesFile] = await Promise.all([
      findStoredFileByIdForUser(String(fileId), session.userId),
      findStoredFileByIdForUser(String(sentencesFileId), session.userId),
    ]);
    if (!sourceFile || sourceFile.category !== 'audio' || !sentencesFile || sentencesFile.scope !== 'subtitles') {
      return NextResponse.json(
        { success: false, message: '文件不存在或无权访问' },
        { status: 404 }
      );
    }
    const sourceDescriptor = toStoredFileDescriptor(sourceFile);
    const sentencesDescriptor = toStoredFileDescriptor(sentencesFile);

    const id = await SubtitleHistoryRepository.create({
      userId: session.userId,
      fileName: sourceDescriptor.name,
      fileId: sourceDescriptor.fileId,
      fileUrl: sourceDescriptor.url,
      sentencesFileId: sentencesDescriptor.fileId,
      sentencesUrl: sentencesDescriptor.url,
      sentenceCount: Number(sentenceCount) || 0,
      durationMs: Number(durationMs) || 0,
    });

    return NextResponse.json({
      success: true,
      message: '保存成功',
      id: id.toString(),
    });
  } catch (error) {
    logError('audio.subtitle-history', 'save history', error);
    return NextResponse.json(
      { success: false, message: '保存失败' },
      { status: 500 }
    );
  }
}
