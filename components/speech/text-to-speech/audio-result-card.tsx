'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAudioExtension } from '@/lib/audio/client/format';
import { downloadUrlFile } from '@/lib/client/download';
import { Download, Play } from 'lucide-react';

interface AudioResultCardProps {
  audioUrl: string;
  autoPlay?: boolean;
}

export function AudioResultCard({ audioUrl, autoPlay = false }: AudioResultCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (autoPlay && audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => undefined);
    }
  }, [audioUrl, autoPlay]);

  if (!audioUrl) return null;

  // 下载生成的音频，文件名带时间戳避免重名
  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const extension = getAudioExtension(audioUrl);
    downloadUrlFile(audioUrl, `tts-audio-${timestamp}.${extension}`);
  };

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          生成的语音
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <audio ref={audioRef} controls className="w-full rounded-lg" src={audioUrl}>
          您的浏览器不支持音频播放。
        </audio>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-control-bg)] px-3 py-2 text-xs font-medium text-[var(--oa-ink)] transition-colors hover:bg-[var(--oa-paper-soft)]"
        >
          <Download className="h-4 w-4" />
          下载音频
        </button>
      </CardContent>
    </Card>
  );
}
